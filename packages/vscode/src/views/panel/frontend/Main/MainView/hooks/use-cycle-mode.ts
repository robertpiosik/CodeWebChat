import { useEffect } from 'react'
import {
  HOME_VIEW_TYPES,
  HomeViewType
} from '@/views/panel/types/home-view-type'
import { ApiMode, WebMode } from '@shared/types/modes'

export const use_cycle_mode = (params: {
  home_view_type: HomeViewType
  web_mode: WebMode
  on_web_mode_change: (mode: WebMode) => void
  api_mode: ApiMode
  on_api_mode_change: (mode: ApiMode) => void
  web_modes: WebMode[]
  api_modes: ApiMode[]
}) => {
  useEffect(() => {
    const handle_key_down = (event: KeyboardEvent) => {
      if (event.shiftKey && event.key === 'Tab') {
        event.preventDefault()
        const go_backwards = event.altKey

        if (params.home_view_type === HOME_VIEW_TYPES.WEB) {
          const current_index = params.web_modes.indexOf(params.web_mode)
          const new_index = go_backwards
            ? (current_index - 1 + params.web_modes.length) %
              params.web_modes.length
            : (current_index + 1) % params.web_modes.length
          params.on_web_mode_change(params.web_modes[new_index])
        } else {
          const current_index = params.api_modes.indexOf(params.api_mode)
          const new_index = go_backwards
            ? (current_index - 1 + params.api_modes.length) %
              params.api_modes.length
            : (current_index + 1) % params.api_modes.length
          params.on_api_mode_change(params.api_modes[new_index])
        }
      }
    }

    window.addEventListener('keydown', handle_key_down)
    return () => {
      window.removeEventListener('keydown', handle_key_down)
    }
  }, [
    params.home_view_type,
    params.web_mode,
    params.api_mode,
    params.web_modes,
    params.api_modes,
    params.on_web_mode_change,
    params.on_api_mode_change
  ])
}
