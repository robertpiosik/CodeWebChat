import { useMemo } from 'react'
import { MODE, Mode } from '@/views/panel/types/main-view-mode'
import { ApiConfiguration } from '@/views/panel/types/messages'
import { CHATBOTS } from '@shared/constants/chatbots'
import { WebConfiguration } from '@shared/types/web-configuration'

export const use_last_choice_tooltip = (params: {
  mode: Mode
  selected_web_configuration_or_group_name?: string
  web_configurations: WebConfiguration[]
  selected_api_configuration_id?: string
  api_configurations: ApiConfiguration[]
}): { name: string; details?: string } | undefined => {
  return useMemo(() => {
    if (params.mode == MODE.WEB) {
      if (params.selected_web_configuration_or_group_name) {
        if (params.selected_web_configuration_or_group_name == 'Ungrouped') {
          return { name: 'Ungrouped' }
        } else {
          const web_configuration = params.web_configurations.find(
            (p) => p.name == params.selected_web_configuration_or_group_name
          )
          if (web_configuration) {
            const is_unnamed =
              !web_configuration.name ||
              /^\(\d+\)$/.test(web_configuration.name.trim())
            let display_name: string
            if (web_configuration.chatbot) {
              display_name = is_unnamed
                ? web_configuration.chatbot
                : web_configuration.name!
            } else {
              display_name = is_unnamed
                ? 'Unnamed group'
                : web_configuration.name!
            }

            const get_details = (): string => {
              const { chatbot, model, reasoning_effort } = web_configuration
              let base: string
              if (!chatbot) {
                base = model || ''
              } else {
                const model_display_name = model
                  ? CHATBOTS[chatbot].models?.[model]?.label || model
                  : null
                if (is_unnamed) {
                  base = model_display_name || ''
                } else if (model_display_name) {
                  base = `${chatbot} · ${model_display_name}`
                } else {
                  base = chatbot
                }
              }
              if (reasoning_effort) {
                base = base ? `${base} · ${reasoning_effort}` : reasoning_effort
              }
              return base
            }

            const details = get_details()
            if (details) {
              return { name: display_name, details }
            } else {
              return { name: display_name }
            }
          }
        }
      }
    } else {
      // MODE.API
      if (params.selected_api_configuration_id !== undefined) {
        const configuration = params.api_configurations.find(
          (c) => c.id === params.selected_api_configuration_id
        )
        if (configuration) {
          const description_parts = [configuration.model_provider_name]
          if (configuration.reasoning_effort) {
            description_parts.push(`${configuration.reasoning_effort}`)
          }
          const description = description_parts.join(' · ')
          return { name: configuration.model, details: description }
        }
      }
    }
    return undefined
  }, [
    params.mode,
    params.selected_web_configuration_or_group_name,
    params.web_configurations,
    params.selected_api_configuration_id,
    params.api_configurations
  ])
}
