import axios, { CancelToken } from 'axios'
import { JSDOM } from 'jsdom'
import { Readability, isProbablyReaderable } from '@mozilla/readability'
import createDOMPurify from 'dompurify'
import TurndownServiceJoplin from '@joplin/turndown'
import * as turndownPluginGfm from '@joplin/turndown-plugin-gfm'
import type TurndownService from 'turndown'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import * as crypto from 'crypto'

const remove_markdown_images = (text: string) => {
  const without_images = text.replace(/!\[([^\]]*)\]\(([^)]*)\)/g, '')
  return without_images.replace(/\n{3,}/g, '\n\n')
}

const create_turndown_service = () => {
  const turndown_service: TurndownService = new TurndownServiceJoplin({
    codeBlockStyle: 'fenced'
  })
  turndown_service.use(turndownPluginGfm.gfm)
  turndown_service.addRule('fencedCodeBlock', {
    filter: (node: any, options: any) => {
      return (
        options.codeBlockStyle == 'fenced' &&
        node.nodeName == 'PRE' &&
        node.querySelector('code')
      )
    },
    replacement: (_: any, node: any, options: any) => {
      const element = node as HTMLElement
      const language = (element
        .querySelector('code')
        ?.className.match(/language-(\S+)/) || [null, ''])[1]

      return (
        '\n\n' +
        options.fence +
        language +
        '\n' +
        element.textContent +
        '\n' +
        options.fence +
        '\n\n'
      )
    }
  })
  // Convert math blocks to markdown
  turndown_service.addRule('multiplemath', {
    filter(node) {
      return (
        node.nodeName == 'SPAN' &&
        (node as HTMLElement).classList.contains('katex-display')
      ) // Check if it's a display math block that centers equation
    },
    replacement(_, node) {
      // "<annotation>" element holds expression string, right for markdown
      const annotation = (node as HTMLElement).querySelector(
        'annotation'
      )?.textContent
      if (!annotation) return ''
      return `$$\n${annotation}\n$$`
    }
  })
  turndown_service.addRule('multiplemath', {
    filter(node) {
      return (
        node.nodeName == 'SPAN' &&
        (node as HTMLElement).classList.contains('katex')
      )
    },
    replacement(_, node) {
      const is_block =
        node.parentNode?.nodeName == 'P' &&
        node.parentNode.childNodes.length == 1
      const annotation = (node as HTMLElement).querySelector(
        'annotation'
      )?.textContent
      if (!annotation) return ''
      return is_block ? `$$ ${annotation} $$` : `$${annotation}$`
    }
  })
  turndown_service.addRule('stripElements', {
    filter: ['figure', 'picture', 'sup'],
    replacement: () => ''
  })
  turndown_service.addRule('removeLinks', {
    filter: 'a',
    replacement: (content) => content
  })
  return turndown_service
}

export const get_website_file_path = (url: string) => {
  const hash = crypto.createHash('md5').update(url).digest('hex')
  const filename = `cwc-website-${hash}.txt`
  return path.join(os.tmpdir(), filename)
}

export const fetch_and_save_website = async (
  url: string,
  cancel_token?: CancelToken
): Promise<string | null> => {
  try {
    const file_path = get_website_file_path(url)

    const response = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Safari/537.36'
      },
      timeout: 5000,
      cancelToken: cancel_token
    })

    if (response.status == 200 && typeof response.data == 'string') {
      const html = response.data
      const window = new JSDOM('').window
      const DOMPurify = createDOMPurify(window as any)
      const clean_html = DOMPurify.sanitize(html)
      const dom = new JSDOM(clean_html, { url })
      const doc = dom.window.document

      if (isProbablyReaderable(doc)) {
        const reader = new Readability(doc, { keepClasses: true })
        const article = reader.parse()

        if (article && article.content) {
          const turndown_service = create_turndown_service()
          const article_dom = new JSDOM(article.content)
          let content = turndown_service.turndown(
            article_dom.window.document.body
          )
          content = remove_markdown_images(content)

          if (content && content.trim().length > 0) {
            if (article.title) {
              content = `# ${article.title}\n\n${content}`
            }

            await fs.promises.writeFile(file_path, content, 'utf-8')
            return content
          }
        }
      }
    }
    return null
  } catch (error) {
    return null
  }
}
