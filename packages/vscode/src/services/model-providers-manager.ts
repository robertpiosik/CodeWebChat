import * as vscode from 'vscode'
import { PROVIDERS } from '@shared/constants/providers'
import { EventEmitter } from 'events'
import {
  TOOL_CONFIG_EDIT_CONTEXT_STATE_KEY,
  TOOL_CONFIG_COMMIT_MESSAGES_STATE_KEY,
  TOOL_CONFIG_CODE_COMPLETIONS_STATE_KEY,
  DEFAULT_CODE_COMPLETIONS_CONFIGURATION_STATE_KEY,
  DEFAULT_COMMIT_MESSAGES_CONFIGURATION_STATE_KEY,
  TOOL_CONFIG_INTELLIGENT_UPDATE_STATE_KEY,
  DEFAULT_INTELLIGENT_UPDATE_CONFIGURATION_STATE_KEY
} from '@/constants/state-keys'
import { SECRET_STORAGE_MODEL_PROVIDERS_KEY } from '@/constants/secret-storage-keys'

export const api_tool_config_emitter = new EventEmitter()
export const API_TOOLS_UPDATED_EVENT = 'api-tools-updated'

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

export type ReasoningEffort = 'none' | 'low' | 'medium' | 'high'

export type InstructionsPlacement = 'above-and-below' | 'below-only'

export type ToolConfig = {
  provider_type: string
  provider_name: string
  model: string
  temperature: number
  reasoning_effort?: ReasoningEffort
  max_concurrency?: number
  instructions_placement?: InstructionsPlacement
}

export type CodeCompletionsConfigs = ToolConfig[]
export type EditContextConfigs = ToolConfig[]
export type IntelligentUpdateConfigs = ToolConfig[]
export type CommitMessagesConfigs = ToolConfig[]

export class ModelProvidersManager {
  private _providers: Provider[] = []
  private _load_promise: Promise<void>

  constructor(private readonly _vscode: vscode.ExtensionContext) {
    this._load_promise = this._load_providers()
  }

  private async _load_providers() {
    try {
      const providers_json = await this._vscode.secrets.get(
        SECRET_STORAGE_MODEL_PROVIDERS_KEY
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
        SECRET_STORAGE_MODEL_PROVIDERS_KEY,
        JSON.stringify(providers)
      )
      this._providers = providers
      api_tool_config_emitter.emit(API_TOOLS_UPDATED_EVENT)
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
    const validated_config = this._validate_tool_config(config)
    if (validated_config) return validated_config

    const configs = await this.get_code_completions_tool_configs()
    if (configs.length == 1) return configs[0]

    return undefined
  }

  public async set_default_code_completions_config(config: ToolConfig | null) {
    await this._vscode.globalState.update(
      DEFAULT_CODE_COMPLETIONS_CONFIGURATION_STATE_KEY,
      config
    )
    api_tool_config_emitter.emit(API_TOOLS_UPDATED_EVENT)
  }

  public async save_code_completions_tool_configs(
    configs: CodeCompletionsConfigs
  ) {
    await this._vscode.globalState.update(
      TOOL_CONFIG_CODE_COMPLETIONS_STATE_KEY,
      configs
    )
    api_tool_config_emitter.emit(API_TOOLS_UPDATED_EVENT)
  }

  public async get_edit_context_tool_configs(): Promise<EditContextConfigs> {
    await this._load_promise
    const configs = this._vscode.globalState.get<EditContextConfigs>(
      TOOL_CONFIG_EDIT_CONTEXT_STATE_KEY,
      []
    )
    return configs.filter((c) => this._validate_tool_config(c) !== undefined)
  }

  public async save_edit_context_tool_configs(configs: EditContextConfigs) {
    await this._vscode.globalState.update(
      TOOL_CONFIG_EDIT_CONTEXT_STATE_KEY,
      configs
    )
    api_tool_config_emitter.emit(API_TOOLS_UPDATED_EVENT)
  }

  public async get_commit_messages_tool_configs(): Promise<CommitMessagesConfigs> {
    await this._load_promise
    const configs = this._vscode.globalState.get<CommitMessagesConfigs>(
      TOOL_CONFIG_COMMIT_MESSAGES_STATE_KEY,
      []
    )
    return configs.filter((c) => this._validate_tool_config(c) !== undefined)
  }

  public async get_default_commit_messages_config(): Promise<
    ToolConfig | undefined
  > {
    await this._load_promise
    const config = this._vscode.globalState.get<ToolConfig>(
      DEFAULT_COMMIT_MESSAGES_CONFIGURATION_STATE_KEY
    )
    const validated_config = this._validate_tool_config(config)
    if (validated_config) return validated_config

    const configs = await this.get_commit_messages_tool_configs()
    if (configs.length == 1) return configs[0]

    return undefined
  }

  public async set_default_commit_messages_config(config: ToolConfig | null) {
    await this._vscode.globalState.update(
      DEFAULT_COMMIT_MESSAGES_CONFIGURATION_STATE_KEY,
      config
    )
    api_tool_config_emitter.emit(API_TOOLS_UPDATED_EVENT)
  }

  public async save_commit_messages_tool_configs(
    configs: CommitMessagesConfigs
  ) {
    await this._vscode.globalState.update(
      TOOL_CONFIG_COMMIT_MESSAGES_STATE_KEY,
      configs
    )
    api_tool_config_emitter.emit(API_TOOLS_UPDATED_EVENT)
  }

  public async get_intelligent_update_tool_configs(): Promise<IntelligentUpdateConfigs> {
    await this._load_promise
    const configs = this._vscode.globalState.get<IntelligentUpdateConfigs>(
      TOOL_CONFIG_INTELLIGENT_UPDATE_STATE_KEY,
      []
    )
    return configs.filter((c) => this._validate_tool_config(c) !== undefined)
  }

  public async get_default_intelligent_update_config(): Promise<
    ToolConfig | undefined
  > {
    await this._load_promise
    const config = this._vscode.globalState.get<ToolConfig>(
      DEFAULT_INTELLIGENT_UPDATE_CONFIGURATION_STATE_KEY
    )
    const validated_config = this._validate_tool_config(config)
    if (validated_config) return validated_config

    const configs = await this.get_intelligent_update_tool_configs()
    if (configs.length == 1) return configs[0]

    return undefined
  }

  public async set_default_intelligent_update_config(
    config: ToolConfig | null
  ) {
    await this._vscode.globalState.update(
      DEFAULT_INTELLIGENT_UPDATE_CONFIGURATION_STATE_KEY,
      config
    )
    api_tool_config_emitter.emit(API_TOOLS_UPDATED_EVENT)
  }

  public async save_intelligent_update_tool_configs(
    configs: IntelligentUpdateConfigs
  ) {
    await this._vscode.globalState.update(
      TOOL_CONFIG_INTELLIGENT_UPDATE_STATE_KEY,
      configs
    )
    api_tool_config_emitter.emit(API_TOOLS_UPDATED_EVENT)
  }

  /**
   * Updates provider name references in all tool configurations when a provider is renamed
   */
  public async update_provider_name_in_configs(params: {
    old_name: string
    new_name: string
  }): Promise<void> {
    const { old_name, new_name } = params

    const completions_configs =
      this._vscode.globalState.get<CodeCompletionsConfigs>(
        TOOL_CONFIG_CODE_COMPLETIONS_STATE_KEY,
        []
      )

    const updated_completions_configs = completions_configs.map((config) => {
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
      updated_completions_configs
    )

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

    const edit_context_configs =
      this._vscode.globalState.get<EditContextConfigs>(
        TOOL_CONFIG_EDIT_CONTEXT_STATE_KEY,
        []
      )

    const updated_edit_context_configs = edit_context_configs.map((config) => {
      if (
        config.provider_type == 'custom' &&
        config.provider_name == old_name
      ) {
        return { ...config, provider_name: new_name }
      }
      return config
    })

    await this._vscode.globalState.update(
      TOOL_CONFIG_EDIT_CONTEXT_STATE_KEY,
      updated_edit_context_configs
    )

    const intelligent_update_configs =
      this._vscode.globalState.get<IntelligentUpdateConfigs>(
        TOOL_CONFIG_INTELLIGENT_UPDATE_STATE_KEY,
        []
      )

    const updated_intelligent_update_configs = intelligent_update_configs.map(
      (config) => {
        if (
          config.provider_type == 'custom' &&
          config.provider_name == old_name
        ) {
          return { ...config, provider_name: new_name }
        }
        return config
      }
    )

    await this._vscode.globalState.update(
      TOOL_CONFIG_INTELLIGENT_UPDATE_STATE_KEY,
      updated_intelligent_update_configs
    )

    const default_intelligent_update_config =
      this._vscode.globalState.get<ToolConfig>(
        DEFAULT_INTELLIGENT_UPDATE_CONFIGURATION_STATE_KEY
      )

    if (
      default_intelligent_update_config &&
      default_intelligent_update_config.provider_type == 'custom' &&
      default_intelligent_update_config.provider_name == old_name
    ) {
      await this._vscode.globalState.update(
        DEFAULT_INTELLIGENT_UPDATE_CONFIGURATION_STATE_KEY,
        { ...default_intelligent_update_config, provider_name: new_name }
      )
    }

    const commit_messages_configs =
      this._vscode.globalState.get<CommitMessagesConfigs>(
        TOOL_CONFIG_COMMIT_MESSAGES_STATE_KEY,
        []
      )

    const updated_commit_messages_configs = commit_messages_configs.map(
      (config) => {
        if (
          config.provider_type == 'custom' &&
          config.provider_name == old_name
        ) {
          return { ...config, provider_name: new_name }
        }
        return config
      }
    )

    await this._vscode.globalState.update(
      TOOL_CONFIG_COMMIT_MESSAGES_STATE_KEY,
      updated_commit_messages_configs
    )

    const default_commit_messages_config =
      this._vscode.globalState.get<ToolConfig>(
        DEFAULT_COMMIT_MESSAGES_CONFIGURATION_STATE_KEY
      )

    if (
      default_commit_messages_config &&
      default_commit_messages_config.provider_type == 'custom' &&
      default_commit_messages_config.provider_name == old_name
    ) {
      await this._vscode.globalState.update(
        DEFAULT_COMMIT_MESSAGES_CONFIGURATION_STATE_KEY,
        { ...default_commit_messages_config, provider_name: new_name }
      )
    }

    api_tool_config_emitter.emit(API_TOOLS_UPDATED_EVENT)
  }
}
