import cn from 'classnames'
import styles from '../PromptField.module.scss'
import { SelectionState } from '../PromptField'

const escape_html = (str: string): string => {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

const process_text_part_for_files = (
  text: string,
  context_file_paths: string[]
): string => {
  const file_path_regex = /`([^\s`]*\.[^\s`]+)`/g
  const parts = text.split(file_path_regex)

  return parts
    .map((part, index) => {
      // part at odd index is a file_path
      if (index % 2 == 1) {
        const file_path = part
        if (context_file_paths.includes(file_path)) {
          const filename = file_path.split('/').pop() || file_path
          return `<span class="${cn(
            styles['keyword'],
            styles['keyword--file']
          )}" data-type="file-keyword" data-path="${escape_html(
            file_path
          )}" title="${escape_html(file_path)}"><span class="${
            styles['keyword__icon']
          }" data-role="keyword-icon"><svg viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M13.106 7.222c0-2.967-2.249-5.032-5.482-5.032-3.35 0-5.646 2.318-5.646 5.702 0 3.493 2.235 5.708 5.762 5.708.862 0 1.689-.123 2.304-.335v-.862c-.43.199-1.354.328-2.29.328-2.926 0-4.813-1.88-4.813-4.798 0-2.844 1.921-4.881 4.594-4.881 2.735 0 4.608 1.688 4.608 4.156 0 1.682-.554 2.769-1.416 2.769-.492 0-.772-.28-.772-.76V5.206H8.923v.834h-.11c-.266-.595-.881-.964-1.6-.964-1.4 0-2.378 1.162-2.378 2.823 0 1.737.957 2.906 2.379 2.906.8 0 1.415-.39 1.709-1.087h.11c.081.67.703 1.148 1.503 1.148 1.572 0 2.57-1.415 2.57-3.643zm-7.177.704c0-1.197.54-1.907 1.456-1.907.93 0 1.524.738 1.524 1.907S8.308 9.84 7.371 9.84c-.895 0-1.442-.725-1.442-1.914z"/></svg></span><span class="${
            styles['keyword__text']
          }" data-role="keyword-text">${escape_html(filename)}</span></span>`
        }
        // If not a context file, return with backticks
        return `\`${escape_html(file_path)}\``
      }
      return escape_html(part)
    })
    .join('')
}

export const get_highlighted_text = (params: {
  text: string
  current_selection?: SelectionState | null
  context_file_paths: string[]
}): string => {
  const saved_context_regex_part =
    '#SavedContext\\((?:WorkspaceState|JSON) "(?:\\\\.|[^"\\\\])*"\\)'

  const commit_regex_part =
    '#(?:Commit|ContextAtCommit)\\([^:]+:[^\\s"]+ "(?:\\\\.|[^"\\\\])*"\\)'

  const fragment_regex_part =
    '<fragment path="[^"]+"(?: [^>]+)?>[\\s\\S]*?<\\/fragment>'

  const skill_regex_part = '#Skill\\([^)]+\\)'

  const regex = new RegExp(
    `(${fragment_regex_part}|#Selection|#Changes\\([^)]+\\)|${saved_context_regex_part}|${commit_regex_part}|${skill_regex_part})`,
    'g'
  )
  const parts = params.text.split(regex)

  const result = parts
    .map((part) => {
      const fragment_match = part.match(
        /^<fragment path="([^"]+)"(?: start="([^"]+)")?(?: end="([^"]+)")?>([\s\S]*?)<\/fragment>$/
      )
      if (part && fragment_match) {
        const path = fragment_match[1]
        const start = fragment_match[2]
        const end = fragment_match[3]
        let content = fragment_match[4]

        if (
          content.startsWith('\n<![CDATA[\n') &&
          content.endsWith('\n]]>\n')
        ) {
          content = content.slice(11, -5)
        } else if (content.startsWith('<![CDATA[') && content.endsWith(']]>')) {
          content = content.slice(9, -3)
        } else if (content.startsWith('\n') && content.endsWith('\n')) {
          content = content.slice(1, -1)
        }

        const line_count = content.split('\n').length
        const lines_text = line_count === 1 ? 'line' : 'lines'

        return `<span class="${cn(
          styles['keyword'],
          styles['keyword--pasted-lines']
        )}" data-type="pasted-lines-keyword" title="${escape_html(
          content
        )}" data-path="${escape_html(path)}" data-content="${escape_html(
          content
        )}"${start ? ` data-start="${escape_html(start)}"` : ''}${
          end ? ` data-end="${escape_html(end)}"` : ''
        }><span class="${
          styles['keyword__icon']
        }" data-role="keyword-icon"></span><span class="${
          styles['keyword__text']
        }" data-role="keyword-text">Pasted ${line_count} ${lines_text}</span></span>`
      }

      if (part == '#Selection') {
        const className = cn(styles['keyword'], styles['keyword--selection'], {
          [styles['keyword--selection-error']]: !params.current_selection
        })
        const title = !params.current_selection
          ? 'Missing text selection'
          : params.current_selection.text
        return `<span class="${className}" data-type="selection-keyword" title="${escape_html(
          title
        )}"><span class="${
          styles['keyword__icon']
        }" data-role="keyword-icon"></span><span class="${
          styles['keyword__text']
        }" data-role="keyword-text">Selection</span></span>`
      }
      if (part && /^#Changes\([^)]+\)$/.test(part)) {
        const branch_name = part.slice(9, -1)
        return `<span class="${cn(
          styles['keyword'],
          styles['keyword--changes']
        )}" data-type="changes-keyword" data-branch-name="${escape_html(
          branch_name
        )}"><span class="${
          styles['keyword__icon']
        }" data-role="keyword-icon"></span><span class="${
          styles['keyword__text']
        }" data-role="keyword-text">Diff with ${escape_html(
          branch_name
        )}</span></span>`
      }
      const saved_context_match = part.match(
        /^#SavedContext\((WorkspaceState|JSON) "((?:\\.|[^"\\])*)"\)$/
      )
      if (part && saved_context_match) {
        const context_type = saved_context_match[1]
        // Unescape quotes and backslashes for display
        const context_name = saved_context_match[2]
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, '\\')
        return `<span class="${cn(
          styles['keyword'],
          styles['keyword--saved-context']
        )}" data-type="saved-context-keyword" data-context-type="${context_type}" data-context-name="${escape_html(
          context_name
        )}"><span class="${
          styles['keyword__icon']
        }" data-role="keyword-icon"></span><span class="${
          styles['keyword__text']
        }" data-role="keyword-text">Context "${escape_html(
          context_name
        )}"</span></span>`
      }
      const commit_match = part.match(
        /^#(Commit|ContextAtCommit)\(([^:]+):([^\s"]+) "((?:\\.|[^"\\])*)"\)$/
      )
      if (part && commit_match) {
        const symbol = commit_match[1]
        const repo_name = commit_match[2]
        const commit_hash = commit_match[3]
        const commit_message = commit_match[4].replace(/\\"/g, '"')
        const short_hash = commit_hash.substring(0, 7)
        return `<span class="${cn(
          styles['keyword'],
          styles[`keyword--${symbol.toLowerCase()}`]
        )}" data-type="${symbol.toLowerCase()}-keyword" data-repo-name="${escape_html(
          repo_name
        )}" data-commit-hash="${escape_html(
          commit_hash
        )}" data-commit-message="${escape_html(
          commit_message
        )}" title="${escape_html(commit_message)}"><span class="${
          styles['keyword__icon']
        }" data-role="keyword-icon"></span><span class="${
          styles['keyword__text']
        }" data-role="keyword-text">${escape_html(short_hash)}</span></span>`
      }

      const skill_match = part.match(/^#Skill\(([^:]+):(.+):([^\s:]+)\)$/)
      if (part && skill_match) {
        const agent = skill_match[1]
        const repo = skill_match[2]
        const skill_name = skill_match[3]

        return `<span class="${cn(
          styles['keyword'],
          styles['keyword--skill']
        )}" data-type="skill-keyword" data-agent="${escape_html(
          agent
        )}" data-repo="${escape_html(repo)}" data-skill-name="${escape_html(
          skill_name
        )}"><span class="${
          styles['keyword__icon']
        }" data-role="keyword-icon"></span><span class="${
          styles['keyword__text']
        }" data-role="keyword-text">${escape_html(skill_name)}</span></span>`
      }

      return process_text_part_for_files(part, params.context_file_paths)
    })
    .join('')

  if (params.text.endsWith('\n')) {
    return result + '<br data-role="trailing-break">'
  }
  return result
}
