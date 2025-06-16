import { CHATBOTS } from '@shared/constants/chatbots'
import { Preset } from '@shared/types/preset'

export type ConfigPresetFormat = {
  name: string
  chatbot: keyof typeof CHATBOTS
  promptPrefix?: string
  promptSuffix?: string
  model?: string
  temperature?: number
  topP?: number
  systemInstructions?: string
  options?: string[]
  port?: number
}

export function config_preset_to_ui_format(
  config_preset: ConfigPresetFormat
): Preset {
  return {
    name: config_preset.name,
    chatbot: config_preset.chatbot,
    prompt_prefix: config_preset.promptPrefix,
    prompt_suffix: config_preset.promptSuffix,
    model: config_preset.model,
    temperature: config_preset.temperature,
    top_p: config_preset.topP,
    system_instructions: config_preset.systemInstructions,
    options: config_preset.options,
    port: config_preset.port
  }
}

export function ui_preset_to_config_format(preset: Preset): ConfigPresetFormat {
  return {
    name: preset.name,
    chatbot: preset.chatbot,
    promptPrefix: preset.prompt_prefix,
    promptSuffix: preset.prompt_suffix,
    model: preset.model,
    temperature: preset.temperature,
    topP: preset.top_p,
    systemInstructions: preset.system_instructions,
    options: preset.options,
    port: preset.port
  }
}