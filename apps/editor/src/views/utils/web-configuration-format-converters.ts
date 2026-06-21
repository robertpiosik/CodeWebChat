import { CHATBOTS } from '@shared/constants/chatbots'
import { WebConfiguration } from '@shared/types/web-configuration'

export type ConfigWebConfigurationFormat = {
  name?: string
  chatbot?: keyof typeof CHATBOTS
  model?: string
  temperature?: number
  topP?: number
  thinkingBudget?: number
  reasoningEffort?: string
  systemInstructions?: string
  options?: string[]
  port?: number
  newUrl?: string
  isPinned?: boolean
}

export const config_web_configuration_to_ui_format = (
  config_web_configuration: ConfigWebConfigurationFormat
): WebConfiguration => {
  return {
    name: config_web_configuration.name,
    chatbot: config_web_configuration.chatbot,
    model: config_web_configuration.model,
    temperature: config_web_configuration.temperature,
    top_p: config_web_configuration.topP,
    thinking_budget: config_web_configuration.thinkingBudget,
    reasoning_effort: config_web_configuration.reasoningEffort,
    system_instructions: config_web_configuration.systemInstructions,
    options: config_web_configuration.options,
    port: config_web_configuration.port,
    new_url: config_web_configuration.newUrl,
    is_pinned: config_web_configuration.isPinned
  }
}

export const ui_web_configuration_to_config_format = (
  web_configuration: WebConfiguration
): ConfigWebConfigurationFormat => {
  return {
    name: web_configuration.name || undefined,
    chatbot: web_configuration.chatbot,
    model: web_configuration.model,
    temperature: web_configuration.temperature,
    topP: web_configuration.top_p,
    thinkingBudget: web_configuration.thinking_budget,
    reasoningEffort: web_configuration.reasoning_effort,
    systemInstructions: web_configuration.system_instructions,
    options: web_configuration.options,
    port: web_configuration.port,
    newUrl: web_configuration.new_url,
    isPinned: web_configuration.is_pinned
  }
}
