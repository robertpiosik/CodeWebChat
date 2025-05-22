import * as vscode from 'vscode'
import { PROVIDERS } from '@shared/constants/providers'
import {
  TOOL_CONFIG_FILE_REFACTORING_STATE_KEY,
  TOOL_CONFIG_COMMIT_MESSAGES_STATE_KEY,
  TOOL_CONFIG_CODE_COMPLETIONS_STATE_KEY,
  DEFAULT_CODE_COMPLETIONS_CONFIGURATION_STATE_KEY,
  DEFAULT_FILE_REFACTORING_CONFIGURATION_STATE_KEY
} from '@/constants/state-keys'
import { SECRET_STORAGE_API_PROVIDERS_KEY } from '@/constants/secret-storage-keys'

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

export type Provider = BuiltInProvider | CustomProvider

export type ToolConfig = {
  provider_type: string
  provider_name: string
  model: string
  temperature: number
}

export type CodeCompletionsConfigs = ToolConfig[]
export type FileRefactoringConfigs = ToolConfig[]

export class ApiProvidersManager {
  private _providers: Provider[] = []
  private _load_promise: Promise<void>

  constructor(private readonly _vscode: vscode.ExtensionContext) {
    this._load_promise = this._load_providers()
  }

  private async _load_providers() {
    try {
      const providers_json = await this._vscode.secrets.get(
        SECRET_STORAGE_API_PROVIDERS_KEY
      )
      const saved_providers = providers_json
        ? (JSON.parse(providers_json) as Provider[])
        : []

      // Make sure all built-in providers exist
      this._providers = saved_providers.filter(
        (provider) => provider.type == 'custom' || PROVIDERS[provider.name]
      )
    } catch (error) {
      console.error('Error loading providers from secret storage:', error)
      this._providers = []
    }
  }

  public async save_providers(providers: Provider[]) {
    try {
      await this._vscode.secrets.store(
        SECRET_STORAGE_API_PROVIDERS_KEY,
        JSON.stringify(providers)
      )
      this._providers = providers
    } catch (error) {
      console.error('Error saving providers to secret storage:', error)
      throw error
    }
  }

  public async get_providers(): Promise<Provider[]> {
    await this._load_promise
    return this._providers
  }

  public async get_provider(name: string): Promise<Provider | undefined> {
    await this._load_promise
    return this._providers.find((provider) => provider.name == name)
  }

  private _validate_tool_config(
    config: ToolConfig | undefined
  ): ToolConfig | undefined {
    if (!config) return undefined

    const provider = this._providers.find(
      (p) => p.type == config.provider_type && p.name == config.provider_name
    )

    if (!provider) {
      return undefined
    }

    return config
  }

  public async get_code_completions_tool_configs(): Promise<CodeCompletionsConfigs> {
    await this._load_promise
    const configs = this._vscode.globalState.get<CodeCompletionsConfigs>(
      TOOL_CONFIG_CODE_COMPLETIONS_STATE_KEY,
      []
    )
    return configs.filter((c) => this._validate_tool_config(c) !== undefined)
  }

  public async get_default_code_completions_config(): Promise<
    ToolConfig | undefined
  > {
    await this._load_promise
    const config = this._vscode.globalState.get<ToolConfig>(
      DEFAULT_CODE_COMPLETIONS_CONFIGURATION_STATE_KEY
    )
    return this._validate_tool_config(config)
  }

  public async set_default_code_completions_config(config: ToolConfig) {
    await this._vscode.globalState.update(
      DEFAULT_CODE_COMPLETIONS_CONFIGURATION_STATE_KEY,
      config
    )
  }

  public async save_code_completions_tool_configs(
    configs: CodeCompletionsConfigs
  ) {
    await this._vscode.globalState.update(
      TOOL_CONFIG_CODE_COMPLETIONS_STATE_KEY,
      configs
    )
  }

  public async get_file_refactoring_tool_configs(): Promise<FileRefactoringConfigs> {
    await this._load_promise
    const configs = this._vscode.globalState.get<FileRefactoringConfigs>(
      TOOL_CONFIG_FILE_REFACTORING_STATE_KEY,
      []
    )
    return configs.filter((c) => this._validate_tool_config(c) !== undefined)
  }

  public async get_default_file_refactoring_config(): Promise<
    ToolConfig | undefined
  > {
    await this._load_promise
    const config = this._vscode.globalState.get<ToolConfig>(
      DEFAULT_FILE_REFACTORING_CONFIGURATION_STATE_KEY
    )
    return this._validate_tool_config(config)
  }

  public async set_default_file_refactoring_config(config: ToolConfig) {
    await this._vscode.globalState.update(
      DEFAULT_FILE_REFACTORING_CONFIGURATION_STATE_KEY,
      config
    )
  }

  public async save_file_refactoring_tool_configs(
    configs: FileRefactoringConfigs
  ) {
    await this._vscode.globalState.update(
      TOOL_CONFIG_FILE_REFACTORING_STATE_KEY,
      configs
    )
  }

  public async get_commit_messages_tool_config(): Promise<
    ToolConfig | undefined
  > {
    await this._load_promise
    const config = this._vscode.globalState.get<ToolConfig>(
      TOOL_CONFIG_COMMIT_MESSAGES_STATE_KEY
    )
    return this._validate_tool_config(config)
  }

  public async save_commit_messages_tool_config(config: ToolConfig) {
    await this._vscode.globalState.update(
      TOOL_CONFIG_COMMIT_MESSAGES_STATE_KEY,
      config
    )
  }

  /**
   * Updates provider name references in all tool configurations
   * when a provider is renamed
   */
  public async update_provider_name_in_configs(params: {
    old_name: string
    new_name: string
  }): Promise<void> {
    const { old_name, new_name } = params

    // Update code completions configs
    const completionsConfig =
      this._vscode.globalState.get<CodeCompletionsConfigs>(
        TOOL_CONFIG_CODE_COMPLETIONS_STATE_KEY,
        []
      )

    const updated_completions_config = completionsConfig.map((config) => {
      if (
        config.provider_type == 'custom' &&
        config.provider_name == old_name
      ) {
        return { ...config, provider_name: new_name }
      }
      return config
    })

    await this._vscode.globalState.update(
      TOOL_CONFIG_CODE_COMPLETIONS_STATE_KEY,
      updated_completions_config
    )

    // Update default code completions config if affected
    const default_completions_config = this._vscode.globalState.get<ToolConfig>(
      DEFAULT_CODE_COMPLETIONS_CONFIGURATION_STATE_KEY
    )

    if (
      default_completions_config &&
      default_completions_config.provider_type == 'custom' &&
      default_completions_config.provider_name == old_name
    ) {
      await this._vscode.globalState.update(
        DEFAULT_CODE_COMPLETIONS_CONFIGURATION_STATE_KEY,
        { ...default_completions_config, provider_name: new_name }
      )
    }

    // Update file refactoring config
    const file_refactoring_config = this._vscode.globalState.get<ToolConfig>(
      TOOL_CONFIG_FILE_REFACTORING_STATE_KEY
    )

    if (
      file_refactoring_config &&
      file_refactoring_config.provider_type == 'custom' &&
      file_refactoring_config.provider_name == old_name
    ) {
      await this._vscode.globalState.update(
        TOOL_CONFIG_FILE_REFACTORING_STATE_KEY,
        { ...file_refactoring_config, provider_name: new_name }
      )
    }

    // Update commit messages config
    const commit_messages_config = this._vscode.globalState.get<ToolConfig>(
      TOOL_CONFIG_COMMIT_MESSAGES_STATE_KEY
    )

    if (
      commit_messages_config &&
      commit_messages_config.provider_type == 'custom' &&
      commit_messages_config.provider_name == old_name
    ) {
      await this._vscode.globalState.update(
        TOOL_CONFIG_COMMIT_MESSAGES_STATE_KEY,
        { ...commit_messages_config, provider_name: new_name }
      )
    }
  }
}
