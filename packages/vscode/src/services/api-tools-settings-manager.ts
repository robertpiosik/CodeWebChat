import * as vscode from 'vscode'
import { Logger } from '@/helpers/logger'
import {
  GEMINI_API_KEY_STATE_KEY,
  OPEN_ROUTER_API_KEY_STATE_KEY
} from '@/constants/state-keys'

export type Provider = 'Gemini API' | 'OpenRouter'

export type ApiToolSettings = {
  provider?: Provider
  model?: string
  temperature?: number
}

const default_provider = 'Gemini API'
const default_model = 'Gemini 2.0 Flash'

export class ApiToolsSettingsManager {
  constructor(private readonly context: vscode.ExtensionContext) {}

  get_gemini_api_key(): string {
    return this.context.globalState.get<string>(GEMINI_API_KEY_STATE_KEY, '')
  }
  async set_gemini_api_key(apiKey: string): Promise<void> {
    await this.context.globalState.update(GEMINI_API_KEY_STATE_KEY, apiKey)
  }

  get_open_router_api_key(): string {
    return this.context.globalState.get<string>(
      OPEN_ROUTER_API_KEY_STATE_KEY,
      ''
    )
  }
  async set_open_router_api_key(apiKey: string): Promise<void> {
    await this.context.globalState.update(OPEN_ROUTER_API_KEY_STATE_KEY, apiKey)
  }

  get_code_completions_settings() {
    const config = vscode.workspace.getConfiguration()
    return config.get<ApiToolSettings>(
      'geminiCoder.codeCompletionsSettings',
      {} as ApiToolSettings
    )
  }

  get_file_refactoring_settings() {
    const config = vscode.workspace.getConfiguration()
    return config.get<ApiToolSettings>(
      'geminiCoder.fileRefactoringSettings',
      {} as ApiToolSettings
    )
  }

  get_apply_chat_response_settings() {
    const config = vscode.workspace.getConfiguration()
    return config.get<ApiToolSettings>(
      'geminiCoder.applyChatResponseSettings',
      {} as ApiToolSettings
    )
  }

  get_commit_messages_settings() {
    const config = vscode.workspace.getConfiguration()
    return config.get<ApiToolSettings>(
      'geminiCoder.commitMessagesSettings',
      {} as ApiToolSettings
    )
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
