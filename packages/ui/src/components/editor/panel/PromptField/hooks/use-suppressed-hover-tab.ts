import { useState, useCallback } from 'react'

export const use_suppressed_hover_tab = (active_tab_index?: number) => {
  const [suppressed_hover_tab_index, set_suppressed_hover_tab_index] = useState<
    number | null
  >(null)

  const [last_active_tab_index, set_last_active_tab_index] =
    useState(active_tab_index)

  if (active_tab_index !== last_active_tab_index) {
    set_last_active_tab_index(active_tab_index)
    if (active_tab_index !== undefined) {
      set_suppressed_hover_tab_index(active_tab_index)
    }
  }

  const handle_mouse_over = useCallback(
    (e: React.MouseEvent) => {
      if (suppressed_hover_tab_index === null) return

      const target = e.target as HTMLElement
      const tab_item = target.closest('[data-role="tab-item"]')
      if (tab_item) {
        const index = parseInt((tab_item as HTMLElement).dataset.index || '-1')
        if (index !== suppressed_hover_tab_index) {
          set_suppressed_hover_tab_index(null)
        }
      } else {
        set_suppressed_hover_tab_index(null)
      }
    },
    [suppressed_hover_tab_index]
  )

  return { suppressed_hover_tab_index, handle_mouse_over }
}
