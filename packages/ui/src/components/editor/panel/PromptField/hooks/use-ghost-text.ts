import {
  useState,
  useRef,
  useEffect,
  RefObject,
  useMemo,
  useCallback
} from 'react'

type UseGhostTextParams = {
  value: string
  input_ref: RefObject<HTMLDivElement>
  is_focused: boolean
  currently_open_file_text?: string
  caret_position: number
}

export const use_ghost_text = ({
  value,
  input_ref,
  is_focused,
  currently_open_file_text,
  caret_position
}: UseGhostTextParams) => {
  const [ghost_text, set_ghost_text] = useState('')
  const ghost_text_debounce_timer_ref = useRef<ReturnType<
    typeof setTimeout
  > | null>(null)
  const [can_show_ghost_text, set_can_show_ghost_text] = useState(false)
  const prev_is_focused_ref = useRef(is_focused)
  const initial_value_on_focus_ref = useRef('')

  useEffect(() => {
    if (is_focused && !prev_is_focused_ref.current) {
      set_can_show_ghost_text(false)
      initial_value_on_focus_ref.current = value
    } else if (
      is_focused &&
      !can_show_ghost_text &&
      value !== initial_value_on_focus_ref.current
    ) {
      set_can_show_ghost_text(true)
    }
    prev_is_focused_ref.current = is_focused
  }, [is_focused, value, can_show_ghost_text])

  const identifiers = useMemo(() => {
    if (!currently_open_file_text) return new Set<string>()
    const matches = currently_open_file_text.match(/[a-zA-Z_][a-zA-Z0-9_]*/g)
    if (!matches) return new Set<string>()
    return new Set(matches.filter((id) => id.length >= 3))
  }, [currently_open_file_text])

  useEffect(() => {
    if (ghost_text_debounce_timer_ref.current) {
      clearTimeout(ghost_text_debounce_timer_ref.current)
      ghost_text_debounce_timer_ref.current = null
    }

    let potential_ghost_text = ''

    if (input_ref.current && is_focused && can_show_ghost_text) {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        if (range.collapsed) {
          const post_caret_range = range.cloneRange()
          post_caret_range.selectNodeContents(input_ref.current)
          post_caret_range.setStart(range.endContainer, range.endOffset)
          const text_after_cursor = post_caret_range.toString()

          if (text_after_cursor === '' || /^\s/.test(text_after_cursor)) {
            const pre_caret_range = range.cloneRange()
            pre_caret_range.selectNodeContents(input_ref.current)
            pre_caret_range.setEnd(range.startContainer, range.startOffset)
            const text_before_cursor = pre_caret_range.toString()
            const last_word_match = text_before_cursor.match(/[\S]+$/)

            if (last_word_match) {
              const last_word_with_prefix = last_word_match[0]
              const word_start_match = last_word_with_prefix.match(/[a-zA-Z_]/)
              if (word_start_match) {
                const last_word = last_word_with_prefix.substring(
                  word_start_match.index ?? 0
                )
                if (last_word.length >= 2) {
                  for (const id of identifiers) {
                    if (id.startsWith(last_word) && id !== last_word) {
                      potential_ghost_text = id.substring(last_word.length)
                      break
                    }
                  }
                }
              }
            }
          }
        }
      }
    }

    if (potential_ghost_text) {
      if (ghost_text) {
        set_ghost_text(potential_ghost_text)
      } else {
        ghost_text_debounce_timer_ref.current = setTimeout(() => {
          set_ghost_text(potential_ghost_text)
        }, 500)
      }
    } else {
      set_ghost_text('')
    }

    return () => {
      if (ghost_text_debounce_timer_ref.current) {
        clearTimeout(ghost_text_debounce_timer_ref.current)
      }
    }
  }, [
    value,
    caret_position,
    identifiers,
    is_focused,
    ghost_text,
    input_ref,
    can_show_ghost_text
  ])

  useEffect(() => {
    const input = input_ref.current
    if (!input) return

    const existing_ghost = input.querySelector('span[data-type="ghost-text"]')
    if (existing_ghost) {
      const parent = existing_ghost.parentNode
      if (parent) {
        parent.removeChild(existing_ghost)
        parent.normalize()
      }
    }

    if (ghost_text) {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        if (range.collapsed) {
          const span = document.createElement('span')
          span.dataset.type = 'ghost-text'
          span.textContent = ghost_text
          span.style.color = 'var(--vscode-editorGhostText-foreground, #888)'
          span.style.pointerEvents = 'none'

          range.insertNode(span)
          selection.collapse(range.startContainer, range.startOffset)
        }
      }
    }
  }, [ghost_text, input_ref])

  const handle_accept_ghost_text = useCallback(() => {
    if (!ghost_text || !input_ref.current) return

    const ghost_node = input_ref.current.querySelector(
      'span[data-type="ghost-text"]'
    )
    if (ghost_node) {
      const text_node = document.createTextNode(ghost_node.textContent || '')
      ghost_node.parentNode?.replaceChild(text_node, ghost_node)

      const selection = window.getSelection()
      if (selection) {
        const range = document.createRange()
        range.setStartAfter(text_node)
        range.collapse(true)
        selection.removeAllRanges()
        selection.addRange(range)
      }

      input_ref.current.dispatchEvent(
        new Event('input', { bubbles: true, cancelable: true })
      )
    }
  }, [ghost_text, input_ref])

  return { ghost_text, handle_accept_ghost_text }
}
