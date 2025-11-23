import { useMemo } from 'react'
import {
  MODE,
  Mode
} from '@/views/panel/types/main-view-mode'
import { ApiToolConfiguration } from '@/views/panel/types/messages'
import { CHATBOTS } from '@shared/constants/chatbots'
import { Preset } from '@shared/types/preset'

export const use_last_choice_button_title = (params: {
  mode: Mode
  selected_preset_or_group_name?: string
  presets: Preset[]
  selected_configuration_id?: string
  configurations: ApiToolConfiguration[]
}): string | undefined => {
  return useMemo(() => {
    if (params.mode == MODE.WEB) {
      if (params.selected_preset_or_group_name) {
        if (params.selected_preset_or_group_name == 'Ungrouped') {
          return 'Ungrouped'
        } else {
          const preset = params.presets.find(
            (p) => p.name == params.selected_preset_or_group_name
          )
          if (preset) {
            const is_unnamed =
              !preset.name || /^\(\d+\)$/.test(preset.name.trim())
            let display_name: string
            if (preset.chatbot) {
              display_name = is_unnamed ? preset.chatbot : preset.name
            } else {
              display_name = is_unnamed ? 'Unnamed group' : preset.name
            }

            const get_subtitle = (): string => {
              const { chatbot, model } = preset
              if (!chatbot) {
                return model || ''
              }
              const model_display_name = model
                ? (CHATBOTS[chatbot].models as any)[model]?.label || model
                : null
              if (is_unnamed) {
                return model_display_name || ''
              }
              if (model_display_name) {
                return `${chatbot} · ${model_display_name}`
              }
              return chatbot
            }

            const subtitle = get_subtitle()
            if (subtitle) {
              return `${display_name} (${subtitle})`
            } else {
              return display_name
            }
          }
        }
      }
    } else {
      // MODE.API
      if (params.selected_configuration_id !== undefined) {
        const configuration = params.configurations.find(
          (c) => c.id === params.selected_configuration_id
        )
        if (configuration) {
          const description_parts = [configuration.provider_name]
          if (configuration.reasoning_effort) {
            description_parts.push(`${configuration.reasoning_effort}`)
          }
          const description = description_parts.join(' · ')
          return `${configuration.model} (${description})`
        }
      }
    }
    return undefined
  }, [
    params.mode,
    params.selected_preset_or_group_name,
    params.presets,
    params.selected_configuration_id,
    params.configurations
  ])
}
