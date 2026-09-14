import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { SECTION_HEADER_HEIGHT, GROUP_TITLE_HEIGHT } from '@ui/constants/sizes'
import type { NavItem, NavConfigItem } from '../Home'

export const use_scroll_to = (params: {
  nav_items_config: NavConfigItem[]
  providers_length: number
  api_configurations_length: number
  scroll_to_section_on_load?: NavItem
}) => {
  const {
    nav_items_config,
    providers_length,
    api_configurations_length,
    scroll_to_section_on_load
  } = params

  const scroll_container_ref = useRef<HTMLDivElement>(null)
  const section_refs = useRef<Partial<Record<NavItem, HTMLDivElement | null>>>(
    {}
  )

  const set_section_ref = useCallback(
    (id: NavItem, el: HTMLDivElement | null) => {
      section_refs.current[id] = el
    },
    []
  )

  const [active_nav_item_id, set_active_nav_item_id] = useState<NavItem>(
    nav_items_config[0].id
  )
  const [is_layout_ready, set_is_layout_ready] = useState(false)

  const last_rendered_item_id = useMemo(() => {
    let last_id = nav_items_config[0].id
    for (const item of nav_items_config) {
      if (item.id === 'section:api:group:providers' && providers_length === 0) {
        continue
      }
      if (
        [
          'section:api:group:api-defaults',
          'section:api:group:system-instructions'
        ].includes(item.id) &&
        api_configurations_length === 0
      ) {
        continue
      }
      last_id = item.id
    }
    return last_id
  }, [nav_items_config, providers_length, api_configurations_length])

  useEffect(() => {
    const scroll_container = scroll_container_ref.current
    const el = section_refs.current[last_rendered_item_id]
    if (!scroll_container || !el) return

    let last_el_content_height = 0
    let last_container_height = 0

    const update = () => {
      if (last_el_content_height && last_container_height) {
        const is_subsection = nav_items_config
          .find((i) => i.id === last_rendered_item_id)
          ?.id.includes(':group:')
        const target_y = is_subsection ? SECTION_HEADER_HEIGHT : 0
        const required = Math.max(
          0,
          last_container_height - target_y - last_el_content_height
        )
        el.style.paddingBottom = `${required}px`
        set_is_layout_ready(true)
      }
    }

    const observer = new ResizeObserver((entries) => {
      let changed = false
      for (const entry of entries) {
        if (entry.target === el) {
          last_el_content_height = entry.contentRect.height
          changed = true
        } else if (entry.target === scroll_container) {
          last_container_height = entry.contentRect.height
          changed = true
        }
      }
      if (changed) update()
    })

    observer.observe(scroll_container)
    observer.observe(el)

    return () => {
      observer.disconnect()
      if (el) el.style.paddingBottom = ''
    }
  }, [last_rendered_item_id, nav_items_config])

  const active_parent_id = useMemo(() => {
    let current_parent: NavItem | null = null
    for (const item of nav_items_config) {
      if (item.id.startsWith('section:') && !item.id.includes(':group:')) {
        current_parent = item.id
      }
      if (item.id === active_nav_item_id) {
        return item.id.includes(':group:') ? current_parent : null
      }
    }
    return null
  }, [active_nav_item_id, nav_items_config])

  useEffect(() => {
    const scroll_container = scroll_container_ref.current
    if (!scroll_container) return

    const handle_scroll = () => {
      const container_rect = scroll_container.getBoundingClientRect()
      let new_active_id = nav_items_config[0].id

      for (const item of nav_items_config) {
        if (
          item.id === 'section:api:group:providers' &&
          providers_length === 0
        ) {
          continue
        }
        if (
          [
            'section:api:group:api-defaults',
            'section:api:group:system-instructions'
          ].includes(item.id) &&
          api_configurations_length === 0
        ) {
          continue
        }
        const el = section_refs.current[item.id]
        if (el) {
          const rect = el.getBoundingClientRect()
          if (
            rect.top <=
            container_rect.top + SECTION_HEADER_HEIGHT + GROUP_TITLE_HEIGHT
          ) {
            new_active_id = item.id
          }
        }
      }
      set_active_nav_item_id(new_active_id)
    }

    scroll_container.addEventListener('scroll', handle_scroll)
    window.addEventListener('resize', handle_scroll)
    setTimeout(handle_scroll, 50)

    return () => {
      scroll_container.removeEventListener('scroll', handle_scroll)
      window.removeEventListener('resize', handle_scroll)
    }
  }, [providers_length, api_configurations_length, nav_items_config])

  const handle_scroll_to_section = useCallback(
    (item_id: NavItem) => {
      const section = section_refs.current[item_id]
      const scroll_container = scroll_container_ref.current

      if (section && scroll_container) {
        const container_rect = scroll_container.getBoundingClientRect()
        const section_rect = section.getBoundingClientRect()

        const offset = section_rect.top - container_rect.top

        let extra_offset = 0
        const is_subsection = nav_items_config
          .find((i) => i.id == item_id)
          ?.id.includes(':group:')
        if (is_subsection) {
          extra_offset = -SECTION_HEADER_HEIGHT
        }

        const target_scroll_top =
          scroll_container.scrollTop + offset + extra_offset

        scroll_container.scrollTo({
          top: target_scroll_top,
          behavior: 'smooth'
        })
      }
    },
    [nav_items_config]
  )

  useEffect(() => {
    if (scroll_to_section_on_load && is_layout_ready) {
      handle_scroll_to_section(scroll_to_section_on_load)
    }
  }, [scroll_to_section_on_load, is_layout_ready, handle_scroll_to_section])

  const handle_nav_click = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, item_id: NavItem) => {
      e.preventDefault()
      handle_scroll_to_section(item_id)
    },
    [handle_scroll_to_section]
  )

  return {
    scroll_container_ref,
    set_section_ref,
    active_nav_item_id,
    active_parent_id,
    handle_nav_click
  }
}
