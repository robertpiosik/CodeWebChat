import * as vscode from 'vscode'
import { PROVIDERS } from '@shared/constants/providers'
import {
  SAVED_API_PROVIDERS_STATE_KEY,
  TOOL_CONFIG_FILE_REFACTORING_STATE_KEY,
  TOOL_CONFIG_COMMIT_MESSAGES_STATE_KEY
} from '@/constants/state-keys'

export type BuiltInProvider = {
  type: 'built-in'
  name: keyof typeof PROVIDERS
  api_key: string
}

export type CustomProvider = {
  type: 'custom'
  name: string
  base_url: string
  api_key: string
}

export type ToolConfig = {
  provider_name: string
  model: string
  temperature?: number
}

export type Provider = BuiltInProvider | CustomProvider

export class ApiProvidersManager {
  private _providers: Provider[] = []

  constructor(private readonly _vscode: vscode.ExtensionContext) {
    this._load_providers()
  }

  private async _load_providers() {
    const saved_providers = this._vscode.globalState
      .get<Provider[]>(SAVED_API_PROVIDERS_STATE_KEY, [])
      // Make sure all built-in providers exist
      .filter(
        (provider) => provider.type == 'custom' || PROVIDERS[provider.name]
      )
    this._providers = saved_providers
  }

  public async save_providers(providers: Provider[]) {
    await this._vscode.globalState.update(
      SAVED_API_PROVIDERS_STATE_KEY,
      providers
    )
    this._providers = providers
  }

  public get_providers() {
    return this._providers
  }

  public async save_file_refactoring_tool_config(config: ToolConfig) {
    await this._vscode.globalState.update(
      TOOL_CONFIG_FILE_REFACTORING_STATE_KEY,
      config
    )
  }

  public get_file_refactoring_tool_config(): ToolConfig | undefined {
    return this._vscode.globalState.get<ToolConfig>(
      TOOL_CONFIG_FILE_REFACTORING_STATE_KEY
    )
  }

  public async save_commit_messages_tool_config(config: ToolConfig) {
    await this._vscode.globalState.update(
      TOOL_CONFIG_COMMIT_MESSAGES_STATE_KEY,
      config
    )
  }

  public get_commit_messages_tool_config(): ToolConfig | undefined {
    return this._vscode.globalState.get<ToolConfig>(
      TOOL_CONFIG_COMMIT_MESSAGES_STATE_KEY
    )
  }
}
