import {
  forwardRef,
  useRef,
  useImperativeHandle,
  useEffect,
  useMemo
} from 'react'
import styles from './PromptTemplate.module.scss'
import { Icon } from '../../../common/Icon'
import {
  get_highlighted_text,
  reconstruct_raw_value_from_node,
  get_caret_position_from_div,
  set_caret_position_for_div,
  map_raw_pos_to_display_pos,
  map_display_pos_to_raw_pos,
  use_symbol_deletion
} from '../shared/symbols'

export type PromptTemplateHandle = {
  focus: () => void
  get_caret_position: () => number
  set_caret_position: (pos: number) => void
}

export type PromptTemplateProps = {
  id: string
  value?: string
  on_change: (value: string) => void
  on_focus: () => void
  on_insert_symbol_click: () => void
}

export const PromptTemplate = forwardRef<
  PromptTemplateHandle,
  PromptTemplateProps
>((props, ref) => {
  const input_ref = useRef<HTMLDivElement>(null)

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

  const { handle_symbol_deletion_by_click, handle_backspace_key } =
    use_symbol_deletion({
      value: props.value || '',
      context_file_paths: [],
      input_ref,
      on_delete: (new_value, new_caret_pos) => {
        props.on_change(new_value)
        setTimeout(() => {
          if (input_ref.current) {
            const display_pos = map_raw_pos_to_display_pos({
              raw_pos: new_caret_pos,
              raw_text: new_value,
              context_file_paths: []
            })
            set_caret_position_for_div(input_ref.current, display_pos)
          }
        }, 0)
      }
    })

  const highlighted_html = useMemo(() => {
    return get_highlighted_text({
      text: props.value || '',
      context_file_paths: [],
      show_clear_button: false
    })
  }, [props.value])

  useEffect(() => {
    if (input_ref.current && input_ref.current.innerHTML !== highlighted_html) {
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
      props.on_change(new_raw_value)
    }

    const native_event = e.nativeEvent as unknown as { inputType?: string }
    if (native_event.inputType?.startsWith('delete')) {
      return
    }

    const new_display_value = currentTarget.textContent ?? ''
    const caret_position = get_caret_position_from_div(currentTarget)
    const char_before_caret = new_display_value.charAt(caret_position - 1)

    if (char_before_caret == '#') {
      const is_at_start = caret_position == 1
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
      const symbol_element = (icon_element as HTMLElement).closest<HTMLElement>(
        '[data-type]'
      )
      if (symbol_element) {
        handle_symbol_deletion_by_click(symbol_element)
      }
    }
  }

  const handle_key_down = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Backspace') {
      handle_backspace_key(e)
    }
  }

  return (
    <div className={styles['prompt-template-wrapper']}>
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
})

PromptTemplate.displayName = 'PromptTemplate'
