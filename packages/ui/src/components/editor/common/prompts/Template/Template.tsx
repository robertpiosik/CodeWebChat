import {
  forwardRef,
  useRef,
  useImperativeHandle,
  useEffect,
  useMemo
} from 'react'
import styles from './Template.module.scss'
import { Icon } from '../../Icon'
import {
  get_highlighted_text,
  reconstruct_raw_value_from_node,
  get_caret_position_from_div,
  set_caret_position_for_div,
  map_raw_pos_to_display_pos,
  map_display_pos_to_raw_pos,
  use_symbol_deletion,
  get_raw_selection_bounds
} from '../shared/symbols'
import { use_undo_redo } from '../shared/hooks/use-undo-redo'

export type TemplateHandle = {
  focus: () => void
  get_caret_position: () => number
  set_caret_position: (pos: number) => void
}

export type TemplateProps = {
  id: string
  value?: string
  placeholder?: string
  on_change: (value: string) => void
  on_focus: () => void
  on_insert_symbol_click: () => void
  highlight_template_variables?: boolean
}

export const Template = forwardRef<TemplateHandle, TemplateProps>(
  (props, ref) => {
    const input_ref = useRef<HTMLDivElement>(null)

    const raw_caret_pos_ref = useRef(0)

    const { save_history, undo, redo } = use_undo_redo({
      value: props.value || '',
      raw_caret_pos_ref,
      on_change: props.on_change,
      on_restore: (entry) => {
        setTimeout(() => {
          if (input_ref.current) {
            const display_pos = map_raw_pos_to_display_pos({
              raw_pos: entry.raw_caret_pos,
              raw_text: entry.value,
              context_file_paths: []
            })
            set_caret_position_for_div(input_ref.current, display_pos)
          }
        }, 0)
      }
    })

    useEffect(() => {
      const handle_selection_change = () => {
        if (document.activeElement === input_ref.current && input_ref.current) {
          const display_pos = get_caret_position_from_div(input_ref.current)
          const raw_pos = map_display_pos_to_raw_pos({
            display_pos,
            raw_text: props.value || '',
            context_file_paths: []
          })
          raw_caret_pos_ref.current = raw_pos
        }
      }

      document.addEventListener('selectionchange', handle_selection_change)
      if (input_ref.current) {
        input_ref.current.addEventListener('focus', handle_selection_change)
      }
      return () => {
        document.removeEventListener('selectionchange', handle_selection_change)
        if (input_ref.current) {
          input_ref.current.removeEventListener(
            'focus',
            handle_selection_change
          )
        }
      }
    }, [props.value])

    useImperativeHandle(ref, () => ({
      focus: () => input_ref.current?.focus(),
      get_caret_position: () => {
        if (!input_ref.current) return 0
        const display_pos = get_caret_position_from_div(input_ref.current)
        return map_display_pos_to_raw_pos({
          display_pos,
          raw_text: props.value || '',
          context_file_paths: []
        })
      },
      set_caret_position: (pos: number) => {
        setTimeout(() => {
          if (!input_ref.current) return
          const current_raw_text = reconstruct_raw_value_from_node(
            input_ref.current
          )
          const display_pos = map_raw_pos_to_display_pos({
            raw_pos: pos,
            raw_text: current_raw_text,
            context_file_paths: []
          })
          set_caret_position_for_div(input_ref.current, display_pos)
        }, 0)
      }
    }))

    const update_value = (new_value: string, caret_pos?: number) => {
      if (new_value === (props.value || '')) return
      save_history()
      props.on_change(new_value)
      if (caret_pos !== undefined) {
        setTimeout(() => {
          if (input_ref.current) {
            const display_pos = map_raw_pos_to_display_pos({
              raw_pos: caret_pos,
              raw_text: new_value,
              context_file_paths: []
            })
            set_caret_position_for_div(input_ref.current, display_pos)
          }
        }, 0)
      }
    }

    const { handle_symbol_deletion_by_click, handle_backspace_key } =
      use_symbol_deletion({
        value: props.value || '',
        context_file_paths: [],
        input_ref,
        on_delete: (new_value, new_caret_pos) => {
          update_value(new_value, new_caret_pos)
        }
      })

    const highlighted_html = useMemo(() => {
      return get_highlighted_text({
        text: props.value || '',
        context_file_paths: [],
        interactive_text: false,
        highlight_template_variables: props.highlight_template_variables ?? true
      })
    }, [props.value, props.highlight_template_variables])

    useEffect(() => {
      if (
        input_ref.current &&
        input_ref.current.innerHTML !== highlighted_html
      ) {
        const is_focused = document.activeElement === input_ref.current
        let selection_start = 0
        if (is_focused) {
          selection_start = get_caret_position_from_div(input_ref.current)
        }
        input_ref.current.innerHTML = highlighted_html
        if (is_focused) {
          set_caret_position_for_div(input_ref.current, selection_start)
        }
      }
    }, [highlighted_html])

    const handle_input = (e: React.FormEvent<HTMLDivElement>) => {
      const currentTarget = e.currentTarget
      const new_raw_value = reconstruct_raw_value_from_node(currentTarget)

      if (new_raw_value !== props.value) {
        update_value(new_raw_value)
      }

      const native_event = e.nativeEvent as unknown as { inputType?: string }
      if (native_event.inputType?.startsWith('delete')) {
        return
      }

      const new_display_value = currentTarget.textContent ?? ''
      const caret_position = get_caret_position_from_div(currentTarget)
      const char_before_caret = new_display_value.charAt(caret_position - 1)

      if (char_before_caret === '#') {
        const is_at_start = caret_position === 1
        let is_after_whitespace = false
        if (caret_position > 1) {
          const char_before_hash = new_display_value.charAt(caret_position - 2)
          is_after_whitespace = /\s/.test(char_before_hash)
        }

        if (is_at_start || is_after_whitespace) {
          props.on_insert_symbol_click()
        }
      }
    }

    const handle_click = (e: React.MouseEvent<HTMLDivElement>) => {
      const target = e.target as HTMLElement
      const icon_element = target.closest('[data-role="symbol-icon"]')

      if (icon_element) {
        e.preventDefault()
        e.stopPropagation()
        const symbol_element = (
          icon_element as HTMLElement
        ).closest<HTMLElement>('[data-type]')
        if (symbol_element) {
          handle_symbol_deletion_by_click(symbol_element)
        }
      }
    }

    const handle_undo = (e: React.KeyboardEvent<HTMLDivElement>) => {
      e.preventDefault()
      undo()
    }

    const handle_redo = (e: React.KeyboardEvent<HTMLDivElement>) => {
      e.preventDefault()
      redo()
    }

    const handle_enter = (e: React.KeyboardEvent<HTMLDivElement>) => {
      e.preventDefault()
      if (!input_ref.current) return
      const bounds = get_raw_selection_bounds({
        input_element: input_ref.current,
        raw_text: props.value || '',
        context_file_paths: []
      })
      if (!bounds) return

      const new_value =
        (props.value || '').substring(0, bounds.raw_start) +
        '\n' +
        (props.value || '').substring(bounds.raw_end)

      update_value(new_value, bounds.raw_start + 1)
    }

    const handle_copy = (e: React.ClipboardEvent<HTMLDivElement>) => {
      if (!input_ref.current) return
      const bounds = get_raw_selection_bounds({
        input_element: input_ref.current,
        raw_text: props.value || '',
        context_file_paths: []
      })
      if (!bounds || bounds.raw_start === bounds.raw_end) return

      e.preventDefault()

      const raw_text_slice = (props.value || '').substring(
        bounds.raw_start,
        bounds.raw_end
      )
      e.clipboardData.setData('text/plain', raw_text_slice)
    }

    const handle_cut = (e: React.ClipboardEvent<HTMLDivElement>) => {
      if (!input_ref.current) return
      const bounds = get_raw_selection_bounds({
        input_element: input_ref.current,
        raw_text: props.value || '',
        context_file_paths: []
      })
      if (!bounds || bounds.raw_start === bounds.raw_end) return

      e.preventDefault()

      const raw_text_slice = (props.value || '').substring(
        bounds.raw_start,
        bounds.raw_end
      )
      e.clipboardData.setData('text/plain', raw_text_slice)

      const new_value =
        (props.value || '').substring(0, bounds.raw_start) +
        (props.value || '').substring(bounds.raw_end)

      update_value(new_value, bounds.raw_start)
    }

    const handle_paste = (e: React.ClipboardEvent<HTMLDivElement>) => {
      e.preventDefault()
      const text = e.clipboardData.getData('text/plain')

      if (!input_ref.current) return
      const bounds = get_raw_selection_bounds({
        input_element: input_ref.current,
        raw_text: props.value || '',
        context_file_paths: []
      })
      if (!bounds) return

      const new_value =
        (props.value || '').substring(0, bounds.raw_start) +
        text +
        (props.value || '').substring(bounds.raw_end)

      update_value(new_value, bounds.raw_start + text.length)
    }

    const handle_key_down = (e: React.KeyboardEvent<HTMLDivElement>) => {
      const { key, shiftKey } = e

      if ((e.ctrlKey || e.metaKey) && !shiftKey && key.toLowerCase() === 'z') {
        handle_undo(e)
        return
      }

      if (
        ((e.ctrlKey || e.metaKey) && key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && shiftKey && key.toLowerCase() === 'z')
      ) {
        handle_redo(e)
        return
      }

      if (key === 'Backspace') {
        handle_backspace_key(e)
        return
      }

      if (key === 'Enter') {
        handle_enter(e)
        return
      }
    }

    return (
      <div className={styles['template-wrapper']}>
        {!props.value && props.placeholder && (
          <div className={styles['placeholder-mirror']}>
            <div className={styles['placeholder-text']}>
              {props.placeholder}
            </div>
          </div>
        )}
        <div
          id={props.id}
          ref={input_ref}
          contentEditable={true}
          suppressContentEditableWarning={true}
          className={styles.input}
          onInput={handle_input}
          onFocus={props.on_focus}
          onClick={handle_click}
          onKeyDown={handle_key_down}
          onCopy={handle_copy}
          onCut={handle_cut}
          onPaste={handle_paste}
        />
        <div className={styles['toolbar']}>
          <button
            className={styles['insert-button']}
            title="Insert Symbol"
            onClick={props.on_insert_symbol_click}
          >
            <Icon variant="HASH_SIGN" />
          </button>
        </div>
      </div>
    )
  }
)

Template.displayName = 'Template'
