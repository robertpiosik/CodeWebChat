import * as vscode from 'vscode'
import { PROVIDERS } from '@shared/constants/providers'
import { SECRET_STORAGE_MODEL_PROVIDERS_KEY } from '@/constants/secret-storage-keys'

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
  temperature?: number
  reasoning_effort?: ReasoningEffort
  max_concurrency?: number
  instructions_placement?: InstructionsPlacement
  is_pinned?: boolean
}

export const get_tool_config_id = (config: ToolConfig): string => {
  return [
    config.provider_name,
    config.model,
    config.temperature,
    config.reasoning_effort ?? '',
    config.max_concurrency ?? '',
    config.instructions_placement ?? ''
  ]
    .filter((v) => v !== null && v !== undefined)
    .join(':')
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
      const config = vscode.workspace.getConfiguration('codeWebChat')
      const provider_configs = config.get<
        {
          type: 'built-in' | 'custom'
          name: string
          baseUrl?: string
        }[]
      >('modelProviders', [])

      const providers_json = await this._vscode.secrets.get(
        SECRET_STORAGE_MODEL_PROVIDERS_KEY
      )
      const saved_providers_with_keys = providers_json
        ? (JSON.parse(providers_json) as Provider[])
        : []

      this._providers = provider_configs
        .map((provider_config) => {
          const provider_with_key = saved_providers_with_keys.find(
            (p) =>
              p.name == provider_config.name && p.type == provider_config.type
          )
          const provider: Provider = {
            type: provider_config.type,
            name: provider_config.name,
            api_key: provider_with_key?.api_key || '',
            ...(provider_config.type == 'custom' && {
              base_url: provider_config.baseUrl || ''
            })
          } as Provider
          return provider
        })
        .filter(
          (provider) => provider.type == 'custom' || PROVIDERS[provider.name]
        )
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const config: any = { type: p.type, name: p.name }
        if (p.type === 'custom') {
          config.baseUrl = p.base_url
        }
        return config
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

    const provider = this._providers.find(
      (p) => p.type == config.provider_type && p.name == config.provider_name
    )

    if (!provider) {
      return undefined
    }

    return config
  }

  private _get_tool_configs_from_settings(settings_key: string): ToolConfig[] {
    const config = vscode.workspace.getConfiguration('codeWebChat')
    const settings_configs = config.get<
      {
        providerName: string
        model: string
        temperature?: number
        reasoningEffort?: ReasoningEffort
        maxConcurrency?: number
        instructionsPlacement?: InstructionsPlacement
        isPinned?: boolean
      }[]
    >(settings_key, [])

    const tool_configs: ToolConfig[] = settings_configs
      .map((sc) => {
        const provider = this._providers.find((p) => p.name === sc.providerName)
        return {
          provider_name: sc.providerName,
          provider_type: provider?.type || '',
          model: sc.model,
          temperature: sc.temperature,
          reasoning_effort: sc.reasoningEffort,
          max_concurrency: sc.maxConcurrency,
          instructions_placement: sc.instructionsPlacement,
          is_pinned: sc.isPinned
        }
      })
      .filter((tc) => tc.provider_type)

    return tool_configs.filter(
      (c) => this._validate_tool_config(c) !== undefined
    )
  }

  private async _save_tool_configs_to_settings(
    settings_key: string,
    configs: ToolConfig[]
  ) {
    const config = vscode.workspace.getConfiguration('codeWebChat')
    const old_settings_configs = config.get<any[]>(settings_key, [])

    const new_settings_configs = configs.map((c) => {
      const old_config = old_settings_configs.find((oldC) =>
        this._are_configs_effectively_equal(oldC, c)
      )
      const new_config: any = {
        providerName: c.provider_name,
        model: c.model,
        temperature: c.temperature,
        isDefault: old_config?.isDefault || false
      }
      if (c.reasoning_effort !== undefined)
        new_config.reasoningEffort = c.reasoning_effort
      if (c.max_concurrency !== undefined)
        new_config.maxConcurrency = c.max_concurrency
      if (c.instructions_placement !== undefined)
        new_config.instructionsPlacement = c.instructions_placement
      if (c.is_pinned) new_config.isPinned = c.is_pinned
      return new_config
    })

    await config.update(
      settings_key,
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
      (settings_config.maxConcurrency ?? undefined) ===
        (tool_config.max_concurrency ?? undefined) &&
      (settings_config.instructionsPlacement ?? undefined) ===
        (tool_config.instructions_placement ?? undefined)
    )
  }

  private _get_default_tool_config_from_settings(
    settings_key: string
  ): ToolConfig | undefined {
    const config = vscode.workspace.getConfiguration('codeWebChat')
    const settings_configs = config.get<
      {
        providerName: string
        model: string
        temperature?: number
        reasoningEffort?: ReasoningEffort
        isDefault?: boolean
        maxConcurrency?: number
        instructionsPlacement?: InstructionsPlacement
        isPinned?: boolean
      }[]
    >(settings_key, [])
    const default_config_from_settings = settings_configs.find(
      (c) => c.isDefault
    )

    if (default_config_from_settings) {
      const provider = this._providers.find(
        (p) => p.name === default_config_from_settings.providerName
      )
      const tool_config: ToolConfig = {
        provider_name: default_config_from_settings.providerName,
        provider_type: provider?.type || '',
        model: default_config_from_settings.model,
        temperature: default_config_from_settings.temperature,
        reasoning_effort: default_config_from_settings.reasoningEffort,
        max_concurrency: default_config_from_settings.maxConcurrency,
        instructions_placement:
          default_config_from_settings.instructionsPlacement,
        is_pinned: default_config_from_settings.isPinned
      }
      const validated_config = this._validate_tool_config(tool_config)
      if (validated_config) return validated_config
    }
    return undefined
  }

  private async _set_default_tool_config_in_settings(
    settings_key: string,
    config_to_set: ToolConfig | null
  ) {
    const config = vscode.workspace.getConfiguration('codeWebChat')
    const settings_configs = config.get<any[]>(settings_key, [])

    const new_settings_configs = settings_configs.map((c) => {
      const is_default =
        config_to_set !== null &&
        this._are_configs_effectively_equal(c, config_to_set)
      return { ...c, isDefault: is_default }
    })

    await config.update(
      settings_key,
      new_settings_configs,
      vscode.ConfigurationTarget.Global
    )
  }

  public async get_code_completions_tool_configs(): Promise<CodeCompletionsConfigs> {
    await this._load_promise
    return this._get_tool_configs_from_settings(
      'configurationsForCodeCompletions'
    )
  }

  public async get_default_code_completions_config(): Promise<
    ToolConfig | undefined
  > {
    await this._load_promise
    const default_config = this._get_default_tool_config_from_settings(
      'configurationsForCodeCompletions'
    )
    if (default_config) return default_config

    const configs = await this.get_code_completions_tool_configs()
    if (configs.length == 1) return configs[0]

    return undefined
  }

  public async set_default_code_completions_config(config: ToolConfig | null) {
    await this._set_default_tool_config_in_settings(
      'configurationsForCodeCompletions',
      config
    )
  }

  public async save_code_completions_tool_configs(
    configs: CodeCompletionsConfigs
  ) {
    await this._save_tool_configs_to_settings(
      'configurationsForCodeCompletions',
      configs
    )
  }

  public async get_edit_context_tool_configs(): Promise<EditContextConfigs> {
    await this._load_promise
    return this._get_tool_configs_from_settings('configurationsForEditContext')
  }

  public async save_edit_context_tool_configs(configs: EditContextConfigs) {
    await this._save_tool_configs_to_settings(
      'configurationsForEditContext',
      configs
    )
  }

  public async get_commit_messages_tool_configs(): Promise<CommitMessagesConfigs> {
    await this._load_promise
    return this._get_tool_configs_from_settings(
      'configurationsForCommitMessages'
    )
  }

  public async get_default_commit_messages_config(): Promise<
    ToolConfig | undefined
  > {
    await this._load_promise
    const default_config = this._get_default_tool_config_from_settings(
      'configurationsForCommitMessages'
    )
    if (default_config) return default_config

    const configs = await this.get_commit_messages_tool_configs()
    if (configs.length == 1) return configs[0]

    return undefined
  }

  public async set_default_commit_messages_config(config: ToolConfig | null) {
    await this._set_default_tool_config_in_settings(
      'configurationsForCommitMessages',
      config
    )
  }

  public async save_commit_messages_tool_configs(
    configs: CommitMessagesConfigs
  ) {
    await this._save_tool_configs_to_settings(
      'configurationsForCommitMessages',
      configs
    )
  }

  public async get_intelligent_update_tool_configs(): Promise<IntelligentUpdateConfigs> {
    await this._load_promise
    return this._get_tool_configs_from_settings(
      'configurationsForIntelligentUpdate'
    )
  }

  public async get_default_intelligent_update_config(): Promise<
    ToolConfig | undefined
  > {
    await this._load_promise
    const default_config = this._get_default_tool_config_from_settings(
      'configurationsForIntelligentUpdate'
    )
    if (default_config) return default_config

    const configs = await this.get_intelligent_update_tool_configs()
    if (configs.length == 1) return configs[0]

    return undefined
  }

  public async set_default_intelligent_update_config(
    config: ToolConfig | null
  ) {
    await this._set_default_tool_config_in_settings(
      'configurationsForIntelligentUpdate',
      config
    )
  }

  public async save_intelligent_update_tool_configs(
    configs: IntelligentUpdateConfigs
  ) {
    await this._save_tool_configs_to_settings(
      'configurationsForIntelligentUpdate',
      configs
    )
  }

  public async update_provider_name_in_configs(params: {
    old_name: string
    new_name: string
  }): Promise<void> {
    const { old_name, new_name } = params
    const config = vscode.workspace.getConfiguration('codeWebChat')

    const settings_keys = [
      'configurationsForCodeCompletions',
      'configurationsForEditContext',
      'configurationsForIntelligentUpdate',
      'configurationsForCommitMessages'
    ]

    for (const key of settings_keys) {
      const configs = config.get<{ providerName: string }[]>(key, [])
      const updated_configs = configs.map((c) => {
        if (c.providerName === old_name) {
          return { ...c, providerName: new_name }
        }
        return c
      })
      await config.update(
        key,
        updated_configs,
        vscode.ConfigurationTarget.Global
      )
    }
  }
}
