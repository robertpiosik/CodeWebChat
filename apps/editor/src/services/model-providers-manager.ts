import * as vscode from 'vscode'
import { SECRET_STORAGE_MODEL_PROVIDERS_KEY } from '@/constants/secret-storage-keys'

export type ModelProvider = {
  name: string
  base_url: string
  api_key: string
}

export type ApiConfiguration = {
  model_provider_name: string
  model: string
  temperature?: number
  reasoning_effort?: string
  is_pinned?: boolean
}

export const get_api_configuration_id = (
  api_configuration: ApiConfiguration
): string => {
  return [
    api_configuration.model_provider_name,
    api_configuration.model,
    api_configuration.temperature,
    api_configuration.reasoning_effort ?? ''
  ]
    .filter((v) => v !== null && v !== undefined)
    .join(':')
}

export class ModelProvidersManager {
  private _model_providers: ModelProvider[] = []
  private _load_promise: Promise<void>

  constructor(private readonly _vscode: vscode.ExtensionContext) {
    this._load_promise = this._load_providers()
  }

  private async _load_providers() {
    try {
      const config = vscode.workspace.getConfiguration('codeWebChat')
      const model_provider_configs = config.get<
        {
          name: string
          baseUrl: string
        }[]
      >('modelProviders', [])

      const providers_json = await this._vscode.secrets.get(
        SECRET_STORAGE_MODEL_PROVIDERS_KEY
      )
      const saved_providers_with_keys = providers_json
        ? (JSON.parse(providers_json) as ModelProvider[])
        : []

      this._model_providers = model_provider_configs.map((provider_config) => {
        const model_provider_with_key = saved_providers_with_keys.find(
          (p) => p.name == provider_config.name
        )
        const model_provider: ModelProvider = {
          name: provider_config.name,
          api_key: model_provider_with_key?.api_key || '',
          base_url: provider_config.baseUrl || ''
        }
        return model_provider
      })
    } catch (error) {
      console.error('Error loading providers:', error)
      this._model_providers = []
    }
  }

  public async save_model_providers(model_providers: ModelProvider[]) {
    try {
      // Save full provider info to secret storage
      await this._vscode.secrets.store(
        SECRET_STORAGE_MODEL_PROVIDERS_KEY,
        JSON.stringify(model_providers)
      )

      // Save provider config to settings
      const model_provider_configs = model_providers.map((p) => {
        return { name: p.name, baseUrl: p.base_url }
      })
      const config = vscode.workspace.getConfiguration('codeWebChat')
      await config.update(
        'modelProviders',
        model_provider_configs,
        vscode.ConfigurationTarget.Global
      )

      this._model_providers = model_providers
    } catch (error) {
      console.error('Error saving providers:', error)
      throw error
    }
  }

  public async get_model_providers(): Promise<ModelProvider[]> {
    await this._load_promise
    return this._model_providers
  }

  public async get_model_provider(
    name: string
  ): Promise<ModelProvider | undefined> {
    await this._load_promise
    return this._model_providers.find(
      (model_provider) => model_provider.name == name
    )
  }

  private _validate_api_configuration(
    api_configuration: ApiConfiguration | undefined
  ): ApiConfiguration | undefined {
    if (!api_configuration) return undefined

    const model_provider = this._model_providers.find(
      (p) => p.name == api_configuration.model_provider_name
    )

    if (!model_provider) {
      return undefined
    }

    return api_configuration
  }

  public async get_api_configurations(): Promise<ApiConfiguration[]> {
    await this._load_promise
    const config = vscode.workspace.getConfiguration('codeWebChat')
    const settings_configs = config.get<any[]>('apiConfigurations', [])

    const api_configurations: ApiConfiguration[] = settings_configs.map(
      (sc) => {
        return {
          model_provider_name: sc.providerName,
          model: sc.model,
          temperature: sc.temperature,
          reasoning_effort: sc.reasoningEffort,
          is_pinned: sc.isPinned
        }
      }
    )

    return api_configurations.filter(
      (c) => this._validate_api_configuration(c) !== undefined
    )
  }

  public async save_api_configurations(api_configurations: ApiConfiguration[]) {
    const config = vscode.workspace.getConfiguration('codeWebChat')
    const old_settings_configs = config.get<any[]>('apiConfigurations', [])

    const new_settings_configs = api_configurations.map((c) => {
      const old_config = old_settings_configs.find((oldC) =>
        this._are_api_configurations_effectively_equal(oldC, c)
      )
      const new_config: any = {
        providerName: c.model_provider_name,
        model: c.model,
        temperature: c.temperature
      }

      if (old_config?.isDefaultForCodeAtCursor)
        new_config.isDefaultForCodeAtCursor = true
      if (old_config?.isDefaultForFindRelevantFiles)
        new_config.isDefaultForFindRelevantFiles = true
      if (old_config?.isDefaultForIntelligentUpdate)
        new_config.isDefaultForIntelligentUpdate = true
      if (old_config?.isDefaultForCommitMessages)
        new_config.isDefaultForCommitMessages = true
      if (old_config?.isDefaultForVoiceInput)
        new_config.isDefaultForVoiceInput = true
      if (c.reasoning_effort !== undefined)
        new_config.reasoningEffort = c.reasoning_effort
      if (c.is_pinned !== undefined) new_config.isPinned = c.is_pinned
      return new_config
    })

    await config.update(
      'apiConfigurations',
      new_settings_configs,
      vscode.ConfigurationTarget.Global
    )
  }

  private _are_api_configurations_effectively_equal(
    settings_config: any,
    api_configuration: ApiConfiguration
  ): boolean {
    return (
      settings_config.providerName === api_configuration.model_provider_name &&
      settings_config.model === api_configuration.model &&
      settings_config.temperature === api_configuration.temperature &&
      (settings_config.reasoningEffort ?? undefined) ===
        (api_configuration.reasoning_effort ?? undefined)
    )
  }

  private _get_default_api_configuration_from_settings(
    default_key: string
  ): ApiConfiguration | undefined {
    const config = vscode.workspace.getConfiguration('codeWebChat')
    const settings_configs = config.get<any[]>('apiConfigurations', [])
    const default_config_from_settings = settings_configs.find(
      (c) => c[default_key]
    )

    if (default_config_from_settings) {
      const api_configuration: ApiConfiguration = {
        model_provider_name: default_config_from_settings.providerName,
        model: default_config_from_settings.model,
        temperature: default_config_from_settings.temperature,
        reasoning_effort: default_config_from_settings.reasoningEffort,
        is_pinned: default_config_from_settings.isPinned
      }
      const validated_config =
        this._validate_api_configuration(api_configuration)
      if (validated_config) return validated_config
    }
    return undefined
  }

  private async _set_default_api_configuration_in_settings(
    default_key: string,
    config_to_set: ApiConfiguration | null
  ) {
    const config = vscode.workspace.getConfiguration('codeWebChat')
    const settings_configs = config.get<any[]>('apiConfigurations', [])

    const new_settings_configs = settings_configs.map((c) => {
      const is_default =
        config_to_set !== null &&
        this._are_api_configurations_effectively_equal(c, config_to_set)

      const new_c = { ...c }
      if (is_default) {
        new_c[default_key] = true
      } else {
        delete new_c[default_key]
      }
      return new_c
    })

    await config.update(
      'apiConfigurations',
      new_settings_configs,
      vscode.ConfigurationTarget.Global
    )
  }

  public async get_default_code_completions_api_configuration(): Promise<
    ApiConfiguration | undefined
  > {
    await this._load_promise
    return this._get_default_api_configuration_from_settings(
      'isDefaultForCodeAtCursor'
    )
  }

  public async set_default_code_completions_api_configuration(
    api_configuration: ApiConfiguration | null
  ) {
    await this._set_default_api_configuration_in_settings(
      'isDefaultForCodeAtCursor',
      api_configuration
    )
  }

  public async get_default_commit_messages_api_configuration(): Promise<
    ApiConfiguration | undefined
  > {
    await this._load_promise
    return this._get_default_api_configuration_from_settings(
      'isDefaultForCommitMessages'
    )
  }

  public async set_default_commit_messages_api_configuration(
    api_configuration: ApiConfiguration | null
  ) {
    await this._set_default_api_configuration_in_settings(
      'isDefaultForCommitMessages',
      api_configuration
    )
  }

  public async get_default_intelligent_update_api_configuration(): Promise<
    ApiConfiguration | undefined
  > {
    await this._load_promise
    return this._get_default_api_configuration_from_settings(
      'isDefaultForIntelligentUpdate'
    )
  }

  public async set_default_intelligent_update_api_configuration(
    api_configuration: ApiConfiguration | null
  ) {
    await this._set_default_api_configuration_in_settings(
      'isDefaultForIntelligentUpdate',
      api_configuration
    )
  }

  public async get_default_find_relevant_files_api_configuration(): Promise<
    ApiConfiguration | undefined
  > {
    await this._load_promise
    return this._get_default_api_configuration_from_settings(
      'isDefaultForFindRelevantFiles'
    )
  }

  public async set_default_find_relevant_files_api_configuration(
    api_configuration: ApiConfiguration | null
  ) {
    await this._set_default_api_configuration_in_settings(
      'isDefaultForFindRelevantFiles',
      api_configuration
    )
  }

  public async get_default_voice_input_api_configuration(): Promise<
    ApiConfiguration | undefined
  > {
    await this._load_promise
    return this._get_default_api_configuration_from_settings(
      'isDefaultForVoiceInput'
    )
  }

  public async set_default_voice_input_api_configuration(
    api_configuration: ApiConfiguration | null
  ) {
    await this._set_default_api_configuration_in_settings(
      'isDefaultForVoiceInput',
      api_configuration
    )
  }

  public async update_model_provider_name_in_api_configurations(params: {
    old_name: string
    new_name: string
  }): Promise<void> {
    const { old_name, new_name } = params
    const config = vscode.workspace.getConfiguration('codeWebChat')

    const configs = config.get<{ providerName: string }[]>(
      'apiConfigurations',
      []
    )
    const updated_configs = configs.map((c) => {
      if (c.providerName == old_name) {
        return { ...c, providerName: new_name }
      }
      return c
    })
    await config.update(
      'apiConfigurations',
      updated_configs,
      vscode.ConfigurationTarget.Global
    )
  }
}
