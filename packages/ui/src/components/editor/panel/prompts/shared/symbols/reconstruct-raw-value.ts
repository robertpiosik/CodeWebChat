export const reconstruct_raw_value_from_node = (node: Node): string => {
  if (node.nodeType == Node.TEXT_NODE) {
    return node.textContent || ''
  } else if ((node as HTMLElement).dataset?.type == 'ghost-text') {
    return ''
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement
    let inner_content = ''
    for (const child of Array.from(el.childNodes)) {
      inner_content += reconstruct_raw_value_from_node(child)
    }

    if (el.dataset.type == 'file-symbol') {
      const path = el.dataset.path
      if (!path) return ''
      const filename = path.split('/').pop() || path
      const index = inner_content.indexOf(filename)
      if (index != -1) {
        const prefix = inner_content.substring(0, index)
        const suffix = inner_content.substring(index + filename.length)
        return `${prefix}\`${path}\`${suffix}`
      }
    } else if (el.dataset.type == 'changes-symbol') {
      const branch_name = el.dataset.branchName
      if (!branch_name) return ''
      const expected_text = `Diff with ${branch_name}`
      const index = inner_content.indexOf(expected_text)
      if (index != -1) {
        const prefix = inner_content.substring(0, index)
        const suffix = inner_content.substring(index + expected_text.length)
        return `${prefix}#Changes(${branch_name})${suffix}`
      }
    } else if (el.dataset.type == 'saved-context-symbol') {
      const context_type = el.dataset.contextType
      const context_name = el.dataset.contextName
      if (!context_type || !context_name) return ''
      const expected_text = `Context "${context_name}"`
      const index = inner_content.indexOf(expected_text)
      if (index != -1) {
        const prefix = inner_content.substring(0, index)
        const suffix = inner_content.substring(index + expected_text.length)
        return `${prefix}#SavedContext(${context_type} "${context_name
          .replace(/\\/g, '\\\\')
          .replace(/"/g, '\\"')}")${suffix}`
      }
    } else if (el.dataset.type == 'selection-symbol') {
      const expected_text = 'Selection'
      const index = inner_content.indexOf(expected_text)
      if (index != -1) {
        const prefix = inner_content.substring(0, index)
        const suffix = inner_content.substring(index + expected_text.length)
        return `${prefix}#Selection${suffix}`
      }
    } else if (el.dataset.type == 'commit-symbol') {
      const repo_name = el.dataset.repoName
      const commit_hash = el.dataset.commitHash
      const commit_message = el.dataset.commitMessage
      if (!repo_name || !commit_hash || commit_message === undefined) {
        return ''
      }
      const short_hash = commit_hash.substring(0, 7)
      const index = inner_content.indexOf(short_hash)
      if (index != -1) {
        const prefix = inner_content.substring(0, index)
        const suffix = inner_content.substring(index + short_hash.length)
        return `${prefix}#Commit(${repo_name}:${commit_hash} "${commit_message.replace(
          /"/g,
          '\\"'
        )}")${suffix}`
      }
    } else if (el.dataset.type == 'contextatcommit-symbol') {
      const repo_name = el.dataset.repoName
      const commit_hash = el.dataset.commitHash
      const commit_message = el.dataset.commitMessage
      if (!repo_name || !commit_hash || commit_message === undefined) {
        return ''
      }
      const short_hash = commit_hash.substring(0, 7)
      const index = inner_content.indexOf(short_hash)
      if (index != -1) {
        const prefix = inner_content.substring(0, index)
        const suffix = inner_content.substring(index + short_hash.length)
        return `${prefix}#ContextAtCommit(${repo_name}:${commit_hash} "${commit_message.replace(
          /"/g,
          '\\"'
        )}")${suffix}`
      }
    } else if (el.dataset.type == 'pasted-lines-symbol') {
      const path = el.dataset.path
      const content = el.dataset.content
      const start = el.dataset.start
      const end = el.dataset.end
      if (!path || content === undefined) return ''

      let attributes = `path="${path}"`
      if (start) attributes += ` start="${start}"`
      if (end) attributes += ` end="${end}"`

      const is_multiline = content.includes('\n')
      const formatted_content = is_multiline
        ? `\n<![CDATA[\n${content}\n]]>\n`
        : `<![CDATA[${content}]]>`
      const line_count = is_multiline ? content.split('\n').length : 1
      const lines_text = line_count === 1 ? 'line' : 'lines'
      const label = `Pasted ${line_count} ${lines_text}`
      const index = inner_content.indexOf(label)

      if (index != -1) {
        const prefix = inner_content.substring(0, index)
        const suffix = inner_content.substring(index + label.length)
        return `${prefix}<fragment ${attributes}>${formatted_content}</fragment>${suffix}`
      }

      return `<fragment ${attributes}>${formatted_content}</fragment>`
    } else if (el.dataset.type == 'skill-symbol') {
      const agent = el.dataset.agent
      const repo = el.dataset.repo
      const skill_name = el.dataset.skillName
      if (!agent || !repo || !skill_name) return ''

      const index = inner_content.indexOf(skill_name)
      if (index != -1) {
        const prefix = inner_content.substring(0, index)
        const suffix = inner_content.substring(index + skill_name.length)
        return `${prefix}#Skill(${agent}:${repo}:${skill_name})${suffix}`
      }
    } else if (el.dataset.type == 'image-symbol') {
      const hash = el.dataset.hash
      if (!hash) return ''

      const expected_text = `Image`
      const index = inner_content.indexOf(expected_text)
      if (index != -1) {
        const prefix = inner_content.substring(0, index)
        const suffix = inner_content.substring(index + expected_text.length)
        return `${prefix}#Image(${hash})${suffix}`
      }
    } else if (el.dataset.type == 'pasted-text-symbol') {
      const hash = el.dataset.hash
      const token_count = el.dataset.tokenCount
      if (!hash || !token_count) return ''

      const expected_text = `Pasted ${token_count} tokens`
      const index = inner_content.indexOf(expected_text)
      if (index != -1) {
        const prefix = inner_content.substring(0, index)
        const suffix = inner_content.substring(index + expected_text.length)
        return `${prefix}#PastedText(${hash}:${token_count})${suffix}`
      }
    } else if (el.dataset.type == 'website-symbol') {
      const url = el.dataset.url
      if (!url) return ''

      let expected_text = 'Website'
      try {
        expected_text = new URL(url).hostname
        if (expected_text.startsWith('www.')) {
          expected_text = expected_text.slice(4)
        }
      } catch {}

      const index = inner_content.indexOf(expected_text)
      if (index != -1) {
        const prefix = inner_content.substring(0, index)
        const suffix = inner_content.substring(index + expected_text.length)
        return `${prefix}#Website(${url})${suffix}`
      }
    }

    if (el.dataset.role == 'tabs-container') return ''

    return inner_content
  }

  return ''
}
