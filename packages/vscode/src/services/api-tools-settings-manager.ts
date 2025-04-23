import * as vscode from 'vscode'
import {
  GEMINI_API_KEY_STATE_KEY,
  OPEN_ROUTER_API_KEY_STATE_KEY
} from '@/constants/state-keys'

export type Provider = 'Gemini API' | 'OpenRouter'

export type ApiToolSettings = {
  provider: Provider
  model: string
  temperature: number
}

const default_provider = 'Gemini API'
const default_model = 'gemini-2.0-flash'
const default_temperature = 0.3

export class ApiToolsSettingsManager {
  constructor(private readonly context: vscode.ExtensionContext) {}

  public provider_to_connection_details(provider: Provider): {
    endpoint_url: string
    api_key: string
  } {
    if (provider == 'Gemini API') {
      return {
        endpoint_url: 'https://generativelanguage.googleapis.com/v1beta',
        api_key: this.get_gemini_api_key()
      }
    } else if (provider == 'OpenRouter') {
      return {
        endpoint_url: 'https://openrouter.ai/api/v1',
        api_key: this.get_open_router_api_key()
      }
    } else {
      throw new Error('Unknown provider')
    }
  }

  get_gemini_api_key(): string {
    return this.context.globalState.get<string>(GEMINI_API_KEY_STATE_KEY, '')
  }
  get_open_router_api_key(): string {
    return this.context.globalState.get<string>(
      OPEN_ROUTER_API_KEY_STATE_KEY,
      ''
    )
  }

  async set_gemini_api_key(apiKey: string): Promise<void> {
    await this.context.globalState.update(GEMINI_API_KEY_STATE_KEY, apiKey)
  }
  async set_open_router_api_key(apiKey: string): Promise<void> {
    await this.context.globalState.update(OPEN_ROUTER_API_KEY_STATE_KEY, apiKey)
  }

  get_code_completions_settings(): ApiToolSettings {
    const config = vscode.workspace.getConfiguration()
    const settings = config.get<ApiToolSettings>(
      'geminiCoder.codeCompletionsSettings',
      {} as ApiToolSettings
    )
    return {
      provider: settings.provider || default_provider,
      model: settings.model || default_model,
      temperature: settings.temperature || default_temperature
    }
  }

  get_file_refactoring_settings(): ApiToolSettings {
    const config = vscode.workspace.getConfiguration()
    const settings = config.get<ApiToolSettings>(
      'geminiCoder.fileRefactoringSettings',
      {} as ApiToolSettings
    )
    return {
      provider: settings.provider || default_provider,
      model: settings.model || default_model,
      temperature: settings.temperature || default_temperature
    }
  }

  get_apply_chat_response_settings(): ApiToolSettings {
    const config = vscode.workspace.getConfiguration()
    const settings = config.get<ApiToolSettings>(
      'geminiCoder.applyChatResponseSettings',
      {} as ApiToolSettings
    )
    return {
      provider: settings.provider || default_provider,
      model: settings.model || default_model,
      temperature: settings.temperature || default_temperature
    }
  }

  get_commit_messages_settings(): ApiToolSettings {
    const config = vscode.workspace.getConfiguration()
    const settings = config.get<ApiToolSettings>(
      'geminiCoder.commitMessagesSettings',
      {} as ApiToolSettings
    )
    return {
      provider: settings.provider || default_provider,
      model: settings.model || default_model,
      temperature: settings.temperature || default_temperature
    }
  }

  // Set settings (moving from view provider)
  async set_code_completions_settings(settings: ApiToolSettings) {
    const config = vscode.workspace.getConfiguration()
    await config.update(
      'geminiCoder.codeCompletionsSettings',
      settings,
      vscode.ConfigurationTarget.Global
    )
  }

  async set_file_refactoring_settings(settings: ApiToolSettings) {
    const config = vscode.workspace.getConfiguration()
    await config.update(
      'geminiCoder.fileRefactoringSettings',
      settings,
      vscode.ConfigurationTarget.Global
    )
  }

  async set_apply_chat_response_settings(settings: ApiToolSettings) {
    const config = vscode.workspace.getConfiguration()
    await config.update(
      'geminiCoder.applyChatResponseSettings',
      settings,
      vscode.ConfigurationTarget.Global
    )
  }

  async set_commit_messages_settings(settings: ApiToolSettings) {
    const config = vscode.workspace.getConfiguration()
    await config.update(
      'geminiCoder.commitMessagesSettings',
      settings,
      vscode.ConfigurationTarget.Global
    )
  }
}
