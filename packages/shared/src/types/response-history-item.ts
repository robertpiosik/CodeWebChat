import { FileInPreview } from './file-in-preview'

export type ApiConfigurationDetails = {
  provider: string
  model: string
  reasoning_effort?: string
}

export type CliConfigurationDetails = {
  agent: string
  flags?: string
}

export type WebConfigurationDetails = {
  chatbot: string
  model?: string
  reasoning_effort?: string
}

export type ResponseHistoryItem = {
  response: string
  raw_instructions?: string
  created_at: number
  lines_added?: number
  lines_removed?: number
  files?: FileInPreview[]
  api_configuration_details?: ApiConfigurationDetails
  cli_configuration_details?: CliConfigurationDetails
  web_configuration_details?: WebConfigurationDetails
  is_not_looked_at?: boolean
  is_from_agentic_cli?: boolean
}
