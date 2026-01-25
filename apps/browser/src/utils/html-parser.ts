import DOMPurify from 'dompurify'
import type TurndownService from 'turndown'
import TurndownServiceJoplin from '@joplin/turndown'
import * as turndownPluginGfm from '@joplin/turndown-plugin-gfm'
import { Readability, isProbablyReaderable } from '@mozilla/readability'

export namespace HtmlParser {
  export const create_turndown_service = (): TurndownService => {
    const turndown_service: TurndownService = new TurndownServiceJoplin({
      codeBlockStyle: 'fenced'
    })
    turndown_service.use(turndownPluginGfm.gfm)
    // Convert code blocks to markdown
    turndown_service.addRule('fencedCodeBlock', {
      filter: (node: any, options: any) => {
        return (
          options.codeBlockStyle == 'fenced' &&
          node.nodeName == 'PRE' &&
          node.querySelector('code')
        )
      },
      replacement: (_: any, node: any, options: any) => {
        const language = (node
          .querySelector('code')
          .className.match(/language-(\S+)/) || [null, ''])[1]

        return (
          '\n\n' +
          options.fence +
          language +
          '\n' +
          node.textContent +
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
          node.nodeName == 'SPAN' && node.classList.contains('katex-display')
        ) // Check if it's a display math block that centers equation
      },
      replacement(_, node) {
        // "<annotation>" element holds expression string, right for markdown
        const annotation = node.querySelector('annotation')?.textContent
        if (!annotation) return ''
        return `$$\n${annotation}\n$$`
      }
    })
    turndown_service.addRule('multiplemath', {
      filter(node) {
        return node.nodeName == 'SPAN' && node.classList.contains('katex')
      },
      replacement(_, node) {
        // Check if the node is the only child of its parent paragraph
        // Yes - block, no - inline
        const is_block =
          node.parentNode?.nodeName == 'P' &&
          node.parentNode.childNodes.length == 1
        // "<annotation>" element holds expression string, right for markdown
        const annotation = node.querySelector('annotation')?.textContent
        if (!annotation) return ''
        return is_block ? `$$ ${annotation} $$` : `$${annotation}$`
      }
    })
    turndown_service.addRule('stripElements', {
      filter: ['figure', 'picture', 'sup'],
      replacement: () => ''
    })
    return turndown_service
  }

  export const parse = async (html: string): Promise<string | undefined> => {
    const turndown_service = create_turndown_service()

    try {
      const parser = new DOMParser()
      const doc = parser.parseFromString(DOMPurify.sanitize(html), 'text/html')
      if (!isProbablyReaderable(doc)) return
      const article = new Readability(doc, { keepClasses: true }).parse()
      if (article && article.content) {
        let content = turndown_service.turndown(article.content)
        content = remove_markdown_images(content)
        return content
      }
    } catch (error) {
      console.error('Error parsing HTML:', error)
      return undefined
    }
  }
}

const remove_markdown_images = (text: string) => {
  // First remove the image markdown
  const without_images = text.replace(/!\[([^\]]*)\]\(([^)]*)\)/g, '')
  // Then remove any resulting empty lines (two or more consecutive newlines)
  return without_images.replace(/\n{3,}/g, '\n\n')
}
