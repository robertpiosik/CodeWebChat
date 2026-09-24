import { useMemo } from 'react'
import { Target } from '@shared/types/target'
import { ApiConfiguration } from '@/views/prompt/types/messages'
import { CliConfiguration } from '@/types/cli-configuration'
import { CHATBOTS } from '@shared/constants/chatbots'
import { WebConfiguration } from '@/types/web-configuration'

export const use_last_choice_tooltip = (params: {
  target: Target
  selected_web_configuration_name?: string
  web_configurations: WebConfiguration[]
  selected_api_configuration_id?: string
  api_configurations: ApiConfiguration[]
  selected_cli_configuration_name?: string
  cli_configurations?: CliConfiguration[]
}): { name: string; details?: string } | undefined => {
  return useMemo(() => {
    if (params.target == 'WEB') {
      if (params.selected_web_configuration_name) {
        if (params.selected_web_configuration_name == 'Ungrouped') {
          return { name: 'Ungrouped' }
        } else {
          const web_configuration = params.web_configurations.find(
            (p) => p.name == params.selected_web_configuration_name
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
    } else if (params.target == 'API') {
      if (params.selected_api_configuration_id !== undefined) {
        const configuration = params.api_configurations.find(
          (c) => c.id == params.selected_api_configuration_id
        )
        if (configuration) {
          const description_parts = [configuration.provider_name]
          if (configuration.reasoning_effort) {
            description_parts.push(`${configuration.reasoning_effort}`)
          }
          const description = description_parts.join(' · ')
          return { name: configuration.model, details: description }
        }
      }
    } else if (params.target == 'CLI') {
      if (
        params.selected_cli_configuration_name &&
        params.cli_configurations
      ) {
        const configuration = params.cli_configurations.find(
          (c) => c.name == params.selected_cli_configuration_name
        )
        if (configuration) {
          const is_unnamed = /^\(\d+\)$/.test(configuration.name.trim())
          const display_name = is_unnamed
            ? configuration.agent
            : configuration.name.replace(/ \(\d+\)$/, '')
          const details: string[] = []
          if (!is_unnamed) {
            details.push(configuration.agent)
          }
          if (configuration.flags) {
            details.push(configuration.flags)
          }
          return {
            name: display_name,
            details: details.join(' · ') || undefined
          }
        }
      }
    }
    return undefined
  }, [
    params.target,
    params.selected_web_configuration_name,
    params.web_configurations,
    params.selected_api_configuration_id,
    params.api_configurations,
    params.selected_cli_configuration_name,
    params.cli_configurations
  ])
}
