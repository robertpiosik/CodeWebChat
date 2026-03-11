import { HandlerContext } from './types'

export const create_handle_input_click = ({
  props,
  params,
  refs,
  state,
  utils
}: HandlerContext) => {
  const handle_clear = () => {
    refs.has_modified_current_entry_ref.current = false
    utils.update_value('')
    state.set_history_index(-1)
  }

  return (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    const icon_element = target.closest('[data-role="symbol-icon"]')
    const text_element = target.closest('[data-role="symbol-text"]')
    const clear_button = target.closest('[data-role="clear-button"]')
    const tab_item = target.closest('[data-role="tab-item"]')
    const tab_new = target.closest('[data-role="tab-new"]')

    if (icon_element) {
      e.preventDefault()
      e.stopPropagation()
      const symbol_element = (icon_element as HTMLElement).closest<HTMLElement>(
        '[data-type]'
      )
      if (symbol_element) {
        utils.handle_symbol_deletion_by_click(symbol_element)
      }
    } else if (text_element) {
      e.preventDefault()
      e.stopPropagation()

      const file_symbol_element = text_element.closest<HTMLElement>(
        '[data-type="file-symbol"]'
      )
      if (file_symbol_element) {
        const file_path = file_symbol_element.getAttribute('title')
        if (file_path) {
          props.on_go_to_file(file_path)
        }
      }

      const pasted_lines_symbol_element = text_element.closest<HTMLElement>(
        '[data-type="pasted-lines-symbol"]'
      )
      if (pasted_lines_symbol_element) {
        const path = pasted_lines_symbol_element.dataset.path
        const start = pasted_lines_symbol_element.dataset.start
        const end = pasted_lines_symbol_element.dataset.end
        if (path) {
          props.on_pasted_lines_click(path, start, end)
        }
      }

      const skill_symbol_element = text_element.closest<HTMLElement>(
        '[data-type="skill-symbol"]'
      )
      if (skill_symbol_element) {
        const repo = skill_symbol_element.dataset.repo
        const skill_name = skill_symbol_element.dataset.skillName

        if (repo && repo != 'local' && skill_name) {
          const parts = repo.split(':')
          if (parts.length == 2) {
            const [user, repo_name] = parts
            const url = `https://skills.sh/${user}/${repo_name}/${skill_name}`
            props.on_open_url(url)
          }
        }
      }

      const image_symbol_element = text_element.closest<HTMLElement>(
        '[data-type="image-symbol"]'
      )
      if (image_symbol_element) {
        const hash = image_symbol_element.dataset.hash
        if (hash) {
          props.on_open_image(hash)
        }
      }

      const pasted_text_symbol_element = text_element.closest<HTMLElement>(
        '[data-type="pasted-text-symbol"]'
      )
      if (pasted_text_symbol_element) {
        const hash = pasted_text_symbol_element.dataset.hash
        if (hash) {
          props.on_open_pasted_text(hash)
        }
      }

      const website_symbol_element = text_element.closest<HTMLElement>(
        '[data-type="website-symbol"]'
      )
      if (website_symbol_element) {
        const url = website_symbol_element.dataset.url
        if (url) {
          props.on_open_website(url)
        }
      }

      if (params.input_ref.current) {
        params.input_ref.current.focus()
      }
    } else if (clear_button) {
      e.preventDefault()
      e.stopPropagation()
      if (props.value) {
        handle_clear()
      } else if (props.tabs_count > 1) {
        props.on_tab_delete(props.active_tab_index)
      }
      if (params.input_ref.current) {
        params.input_ref.current.focus()
      }
    } else if (tab_item) {
      e.preventDefault()
      e.stopPropagation()
      const index = parseInt((tab_item as HTMLElement).dataset.index || '0')
      if (index !== props.active_tab_index) {
        props.on_tab_change?.(index)
      }
    } else if (tab_new) {
      e.preventDefault()
      e.stopPropagation()
      props.on_new_tab?.()
    }
  }
}
