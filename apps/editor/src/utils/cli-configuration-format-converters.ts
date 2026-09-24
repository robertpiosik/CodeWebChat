import { AGENTS } from '@/constants/agents'
import { CliConfiguration } from '@/types/cli-configuration'

export type ConfigAgentConfigurationFormat = {
  name: string
  agent: keyof typeof AGENTS
  flags?: string
  isPinned?: boolean
}

export const config_cli_configuration_to_ui_format = (
  config_cli_configuration: ConfigAgentConfigurationFormat
): CliConfiguration => {
  return {
    name: config_cli_configuration.name,
    agent: config_cli_configuration.agent,
    flags: config_cli_configuration.flags,
    is_pinned: config_cli_configuration.isPinned
  }
}

export const ui_cli_configuration_to_config_format = (
  cli_configuration: CliConfiguration
): ConfigAgentConfigurationFormat => {
  return {
    name: cli_configuration.name,
    agent: cli_configuration.agent as keyof typeof AGENTS,
    flags: cli_configuration.flags,
    isPinned: cli_configuration.is_pinned
  }
}