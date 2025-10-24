import { useState, useRef, useEffect } from 'react'
import type { ChatInputProps } from '../ChatInput'

type UseDropdownParams = Pick<
  ChatInputProps,
  'on_copy' | 'on_submit_with_control'
>

export const use_dropdown = ({
  on_copy,
  on_submit_with_control
}: UseDropdownParams) => {
  const dropdown_ref = useRef<HTMLDivElement>(null)
  const [is_dropdown_open, set_is_dropdown_open] = useState(false)

  const toggle_dropdown = () => {
    set_is_dropdown_open((prev) => !prev)
  }

  const close_dropdown = () => {
    set_is_dropdown_open(false)
  }

  useEffect(() => {
    const handle_click_outside = (event: MouseEvent) => {
      if (
        dropdown_ref.current &&
        !dropdown_ref.current.contains(event.target as Node)
      ) {
        close_dropdown()
      }
    }

    document.addEventListener('mousedown', handle_click_outside)
    return () => {
      document.removeEventListener('mousedown', handle_click_outside)
    }
  }, [])

  const handle_copy_click = (e: React.MouseEvent) => {
    e.stopPropagation()
    on_copy()
    close_dropdown()
  }

  const handle_select_click = (e: React.MouseEvent) => {
    e.stopPropagation()
    on_submit_with_control()
    close_dropdown()
  }

  return {
    is_dropdown_open,
    toggle_dropdown,
    dropdown_ref,
    handle_copy_click,
    handle_select_click
  }
}
