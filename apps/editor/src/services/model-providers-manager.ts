import * as vscode from 'vscode'
import { SECRET_STORAGE_MODEL_PROVIDERS_KEY } from '@/constants/secret-storage-keys'

export type Provider = {
  name: string
  base_url: string
  api_key: string
}

export type ToolConfig = {
  provider_name: string
  model: string
  temperature?: number
  reasoning_effort?: string
  system_instructions_override?: string
  is_pinned?: boolean
}

export const get_tool_config_id = (config: ToolConfig): string => {
  return [
    config.provider_name,
    config.model,
    config.temperature,
    config.reasoning_effort ?? ''
  ]
    .filter((v) => v !== null && v !== undefined)
    .join(':')
}

export type CodeCompletionsConfigs = ToolConfig[]
export type EditContextConfigs = ToolConfig[]
export type IntelligentUpdateConfigs = ToolConfig[]
export type CommitMessagesConfigs = ToolConfig[]
export type FindRelevantFilesConfigs = ToolConfig[]
export type VoiceInputConfigs = ToolConfig[]

export class ModelProvidersManager {
  private _providers: Provider[] = []
  private _load_promise: Promise<void>

  constructor(private readonly _vscode: vscode.ExtensionContext) {
    this._load_promise = this._load_providers()
  }

  private async _load_providers() {
    try {
      const config = vscode.workspace.getConfiguration('codeWebChat')
      const provider_configs = config.get<
        {
          name: string
          baseUrl: string
        }[]
      >('modelProviders', [])

      const providers_json = await this._vscode.secrets.get(
        SECRET_STORAGE_MODEL_PROVIDERS_KEY
      )
      const saved_providers_with_keys = providers_json
        ? (JSON.parse(providers_json) as Provider[])
        : []

      this._providers = provider_configs.map((provider_config) => {
        const provider_with_key = saved_providers_with_keys.find(
          (p) => p.name == provider_config.name
        )
        const provider: Provider = {
          name: provider_config.name,
          api_key: provider_with_key?.api_key || '',
          base_url: provider_config.baseUrl || ''
        }
        return provider
      })
    } catch (error) {
      console.error('Error loading providers:', error)
      this._providers = []
    }
  }

  public async save_providers(providers: Provider[]) {
    try {
      // Save full provider info to secret storage
      await this._vscode.secrets.store(
        SECRET_STORAGE_MODEL_PROVIDERS_KEY,
        JSON.stringify(providers)
      )

      // Save provider config to settings
      const provider_configs = providers.map((p) => {
        return { name: p.name, baseUrl: p.base_url }
      })
      const config = vscode.workspace.getConfiguration('codeWebChat')
      await config.update(
        'modelProviders',
        provider_configs,
        vscode.ConfigurationTarget.Global
      )

      this._providers = providers
    } catch (error) {
      console.error('Error saving providers:', error)
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

    const provider = this._providers.find((p) => p.name == config.provider_name)

    if (!provider) {
      return undefined
    }

    return config
  }

  private _get_tool_configs_from_settings(): ToolConfig[] {
    const config = vscode.workspace.getConfiguration('codeWebChat')
    const settings_configs = config.get<any[]>('configurations', [])

    const tool_configs: ToolConfig[] = settings_configs.map((sc) => {
      return {
        provider_name: sc.providerName,
        model: sc.model,
        temperature: sc.temperature,
        reasoning_effort: sc.reasoningEffort,
        system_instructions_override: sc.systemInstructionsOverride,
        is_pinned: sc.isPinned
      }
    })

    return tool_configs.filter(
      (c) => this._validate_tool_config(c) !== undefined
    )
  }

  private async _save_tool_configs_to_settings(configs: ToolConfig[]) {
    const config = vscode.workspace.getConfiguration('codeWebChat')
    const old_settings_configs = config.get<any[]>('configurations', [])

    const new_settings_configs = configs.map((c) => {
      const old_config = old_settings_configs.find((oldC) =>
        this._are_configs_effectively_equal(oldC, c)
      )
      const new_config: any = {
        providerName: c.provider_name,
        model: c.model,
        temperature: c.temperature,
        isDefaultForCodeAtCursor: old_config?.isDefaultForCodeAtCursor || false,
        isDefaultForFindRelevantFiles:
          old_config?.isDefaultForFindRelevantFiles || false,
        isDefaultForIntelligentUpdate:
          old_config?.isDefaultForIntelligentUpdate || false,
        isDefaultForCommitMessages:
          old_config?.isDefaultForCommitMessages || false,
        isDefaultForVoiceInput: old_config?.isDefaultForVoiceInput || false
      }
      if (c.reasoning_effort !== undefined)
        new_config.reasoningEffort = c.reasoning_effort
      if (c.system_instructions_override !== undefined)
        new_config.systemInstructionsOverride = c.system_instructions_override
      if (c.is_pinned !== undefined) new_config.isPinned = c.is_pinned
      return new_config
    })

    await config.update(
      'configurations',
      new_settings_configs,
      vscode.ConfigurationTarget.Global
    )
  }

  private _are_configs_effectively_equal(
    settings_config: any,
    tool_config: ToolConfig
  ): boolean {
    return (
      settings_config.providerName === tool_config.provider_name &&
      settings_config.model === tool_config.model &&
      settings_config.temperature === tool_config.temperature &&
      (settings_config.reasoningEffort ?? undefined) ===
        (tool_config.reasoning_effort ?? undefined) &&
      (settings_config.systemInstructionsOverride ?? undefined) ===
        (tool_config.system_instructions_override ?? undefined)
    )
  }

  private _get_default_tool_config_from_settings(
    default_key: string
  ): ToolConfig | undefined {
    const config = vscode.workspace.getConfiguration('codeWebChat')
    const settings_configs = config.get<any[]>('configurations', [])
    const default_config_from_settings = settings_configs.find(
      (c) => c[default_key]
    )

    if (default_config_from_settings) {
      const tool_config: ToolConfig = {
        provider_name: default_config_from_settings.providerName,
        model: default_config_from_settings.model,
        temperature: default_config_from_settings.temperature,
        reasoning_effort: default_config_from_settings.reasoningEffort,
        system_instructions_override:
          default_config_from_settings.systemInstructionsOverride,
        is_pinned: default_config_from_settings.isPinned
      }
      const validated_config = this._validate_tool_config(tool_config)
      if (validated_config) return validated_config
    }
    return undefined
  }

  private async _set_default_tool_config_in_settings(
    default_key: string,
    config_to_set: ToolConfig | null
  ) {
    const config = vscode.workspace.getConfiguration('codeWebChat')
    const settings_configs = config.get<any[]>('configurations', [])

    const new_settings_configs = settings_configs.map((c) => {
      const is_default =
        config_to_set !== null &&
        this._are_configs_effectively_equal(c, config_to_set)
      return { ...c, [default_key]: is_default }
    })

    await config.update(
      'configurations',
      new_settings_configs,
      vscode.ConfigurationTarget.Global
    )
  }

  public async get_code_completions_tool_configs(): Promise<CodeCompletionsConfigs> {
    await this._load_promise
    return this._get_tool_configs_from_settings()
  }

  public async get_default_code_completions_config(): Promise<
    ToolConfig | undefined
  > {
    await this._load_promise
    return this._get_default_tool_config_from_settings(
      'isDefaultForCodeAtCursor'
    )
  }

  public async set_default_code_completions_config(config: ToolConfig | null) {
    await this._set_default_tool_config_in_settings(
      'isDefaultForCodeAtCursor',
      config
    )
  }

  public async save_code_completions_tool_configs(
    configs: CodeCompletionsConfigs
  ) {
    await this._save_tool_configs_to_settings(configs)
  }

  public async get_edit_context_tool_configs(): Promise<EditContextConfigs> {
    await this._load_promise
    return this._get_tool_configs_from_settings()
  }

  public async save_edit_context_tool_configs(configs: EditContextConfigs) {
    await this._save_tool_configs_to_settings(configs)
  }

  public async get_commit_messages_tool_configs(): Promise<CommitMessagesConfigs> {
    await this._load_promise
    return this._get_tool_configs_from_settings()
  }

  public async get_default_commit_messages_config(): Promise<
    ToolConfig | undefined
  > {
    await this._load_promise
    return this._get_default_tool_config_from_settings(
      'isDefaultForCommitMessages'
    )
  }

  public async set_default_commit_messages_config(config: ToolConfig | null) {
    await this._set_default_tool_config_in_settings(
      'isDefaultForCommitMessages',
      config
    )
  }

  public async save_commit_messages_tool_configs(
    configs: CommitMessagesConfigs
  ) {
    await this._save_tool_configs_to_settings(configs)
  }

  public async get_intelligent_update_tool_configs(): Promise<IntelligentUpdateConfigs> {
    await this._load_promise
    return this._get_tool_configs_from_settings()
  }

  public async get_default_intelligent_update_config(): Promise<
    ToolConfig | undefined
  > {
    await this._load_promise
    return this._get_default_tool_config_from_settings(
      'isDefaultForIntelligentUpdate'
    )
  }

  public async set_default_intelligent_update_config(
    config: ToolConfig | null
  ) {
    await this._set_default_tool_config_in_settings(
      'isDefaultForIntelligentUpdate',
      config
    )
  }

  public async save_intelligent_update_tool_configs(
    configs: IntelligentUpdateConfigs
  ) {
    await this._save_tool_configs_to_settings(configs)
  }

  public async get_find_relevant_files_tool_configs(): Promise<FindRelevantFilesConfigs> {
    await this._load_promise
    return this._get_tool_configs_from_settings()
  }

  public async get_default_find_relevant_files_config(): Promise<
    ToolConfig | undefined
  > {
    await this._load_promise
    return this._get_default_tool_config_from_settings(
      'isDefaultForFindRelevantFiles'
    )
  }

  public async set_default_find_relevant_files_config(
    config: ToolConfig | null
  ) {
    await this._set_default_tool_config_in_settings(
      'isDefaultForFindRelevantFiles',
      config
    )
  }

  public async save_find_relevant_files_tool_configs(
    configs: FindRelevantFilesConfigs
  ) {
    await this._save_tool_configs_to_settings(configs)
  }

  public async get_voice_input_tool_configs(): Promise<VoiceInputConfigs> {
    await this._load_promise
    return this._get_tool_configs_from_settings()
  }

  public async get_default_voice_input_config(): Promise<
    ToolConfig | undefined
  > {
    await this._load_promise
    return this._get_default_tool_config_from_settings('isDefaultForVoiceInput')
  }

  public async set_default_voice_input_config(config: ToolConfig | null) {
    await this._set_default_tool_config_in_settings(
      'isDefaultForVoiceInput',
      config
    )
  }

  public async save_voice_input_tool_configs(configs: VoiceInputConfigs) {
    await this._save_tool_configs_to_settings(configs)
  }

  public async update_provider_name_in_configs(params: {
    old_name: string
    new_name: string
  }): Promise<void> {
    const { old_name, new_name } = params
    const config = vscode.workspace.getConfiguration('codeWebChat')

    const configs = config.get<{ providerName: string }[]>('configurations', [])
    const updated_configs = configs.map((c) => {
      if (c.providerName === old_name) {
        return { ...c, providerName: new_name }
      }
      return c
    })
    await config.update(
      'configurations',
      updated_configs,
      vscode.ConfigurationTarget.Global
    )
  }
}
