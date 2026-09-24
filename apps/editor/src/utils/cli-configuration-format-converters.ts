import { AGENTS } from '@/constants/agents'
import { CliConfiguration } from '@/types/cli-configuration'

export type ConfigAgentConfigurationFormat = {
  name: string
  agent: keyof typeof AGENTS
  flags?: string
  isPinned?: boolean
}

export const config_agent_configuration_to_ui_format = (
  config_agent_configuration: ConfigAgentConfigurationFormat
): CliConfiguration => {
  return {
    name: config_agent_configuration.name,
    agent: config_agent_configuration.agent,
    flags: config_agent_configuration.flags,
    is_pinned: config_agent_configuration.isPinned
  }
}

export const ui_agent_configuration_to_config_format = (
  agent_configuration: CliConfiguration
): ConfigAgentConfigurationFormat => {
  return {
    name: agent_configuration.name,
    agent: agent_configuration.agent as keyof typeof AGENTS,
    flags: agent_configuration.flags,
    isPinned: agent_configuration.is_pinned
  }
}