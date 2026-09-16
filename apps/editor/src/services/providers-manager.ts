import * as vscode from 'vscode'
import { SECRET_STORAGE_PROVIDERS_KEY } from '@/constants/secret-storage-keys'

export type Provider = {
  name: string
  base_url: string
  api_key: string
  extended_cache?: boolean
}

export type ApiConfiguration = {
  provider_name: string
  model: string
  reasoning_effort?: string
  is_pinned?: boolean
}

export type ConfigApiConfigurationFormat = {
  providerName: string
  model: string
  reasoningEffort?: string
  isPinned?: boolean
  isDefaultForCodeAtCursor?: boolean
  isDefaultForPatchRepair?: boolean
  isDefaultForVoiceInput?: boolean
}

export const get_api_configuration_id = (
  api_configuration: ApiConfiguration
): string => {
  return [
    api_configuration.provider_name,
    api_configuration.model,
    api_configuration.reasoning_effort ?? ''
  ]
    .filter((v) => v !== null && v !== undefined)
    .join(':')
}

export class ProvidersManager {
  private _providers: Provider[] = []
  private _load_promise: Promise<void>

  constructor(private readonly _extension_context: vscode.ExtensionContext) {
    this._load_promise = this._load_providers()
  }

  private async _load_providers() {
    try {
      const config = vscode.workspace.getConfiguration('codeWebChat')
      const provider_configs = config.get<
        {
          name: string
          baseUrl: string
          extendedCache?: boolean
        }[]
      >('providers', [])

      const providers_json = await this._extension_context.secrets.get(
        SECRET_STORAGE_PROVIDERS_KEY
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
          base_url: provider_config.baseUrl || '',
          extended_cache: provider_config.extendedCache
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
      await this._extension_context.secrets.store(
        SECRET_STORAGE_PROVIDERS_KEY,
        JSON.stringify(providers)
      )

      const provider_configs = providers.map((p) => {
        const config: {
          name: string
          baseUrl: string
          extendedCache?: boolean
        } = {
          name: p.name,
          baseUrl: p.base_url
        }
        if (p.extended_cache) {
          config.extendedCache = true
        }
        return config
      })
      const config = vscode.workspace.getConfiguration('codeWebChat')
      await config.update(
        'providers',
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

  private _validate_api_configuration(
    api_configuration: ApiConfiguration | undefined
  ): ApiConfiguration | undefined {
    if (!api_configuration) return undefined

    const provider = this._providers.find(
      (p) => p.name == api_configuration.provider_name
    )

    if (!provider) {
      return undefined
    }

    return api_configuration
  }

  public async get_api_configurations(): Promise<ApiConfiguration[]> {
    await this._load_promise
    const config = vscode.workspace.getConfiguration('codeWebChat')
    const settings_configs = config.get<ConfigApiConfigurationFormat[]>(
      'models',
      []
    )

    const api_configurations: ApiConfiguration[] = settings_configs.map(
      (sc) => {
        return {
          provider_name: sc.providerName,
          model: sc.model,
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
    const old_settings_configs = config.get<ConfigApiConfigurationFormat[]>(
      'models',
      []
    )

    const new_settings_configs = api_configurations.map((c) => {
      const old_config = old_settings_configs.find((oldC) =>
        this._are_api_configurations_effectively_equal(oldC, c)
      )
      const new_config: ConfigApiConfigurationFormat = {
        providerName: c.provider_name,
        model: c.model
      }

      if (old_config?.isDefaultForCodeAtCursor)
        new_config.isDefaultForCodeAtCursor = true
      if (old_config?.isDefaultForPatchRepair)
        new_config.isDefaultForPatchRepair = true
      if (old_config?.isDefaultForVoiceInput)
        new_config.isDefaultForVoiceInput = true
      if (c.reasoning_effort !== undefined)
        new_config.reasoningEffort = c.reasoning_effort
      if (c.is_pinned !== undefined) new_config.isPinned = c.is_pinned
      return new_config
    })

    await config.update(
      'models',
      new_settings_configs,
      vscode.ConfigurationTarget.Global
    )
  }

  private _are_api_configurations_effectively_equal(
    settings_config: ConfigApiConfigurationFormat,
    api_configuration: ApiConfiguration
  ): boolean {
    return (
      settings_config.providerName === api_configuration.provider_name &&
      settings_config.model === api_configuration.model &&
      (settings_config.reasoningEffort ?? undefined) ===
        (api_configuration.reasoning_effort ?? undefined)
    )
  }

  private _get_default_api_configuration_from_settings(
    default_key: keyof ConfigApiConfigurationFormat
  ): ApiConfiguration | undefined {
    const config = vscode.workspace.getConfiguration('codeWebChat')
    const settings_configs = config.get<ConfigApiConfigurationFormat[]>(
      'models',
      []
    )
    const default_config_from_settings = settings_configs.find(
      (c) => c[default_key]
    )

    if (default_config_from_settings) {
      const api_configuration: ApiConfiguration = {
        provider_name: default_config_from_settings.providerName,
        model: default_config_from_settings.model,
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
    default_key: keyof ConfigApiConfigurationFormat,
    config_to_set: ApiConfiguration | null
  ) {
    const config = vscode.workspace.getConfiguration('codeWebChat')
    const settings_configs = config.get<ConfigApiConfigurationFormat[]>(
      'models',
      []
    )

    const new_settings_configs = settings_configs.map((c) => {
      const is_default =
        config_to_set !== null &&
        this._are_api_configurations_effectively_equal(c, config_to_set)

      const new_c = { ...c }
      if (is_default) {
        ;(new_c as any)[default_key] = true
      } else {
        delete new_c[default_key]
      }
      return new_c
    })

    await config.update(
      'models',
      new_settings_configs,
      vscode.ConfigurationTarget.Global
    )
  }

  public async get_default_code_at_cursor_api_configuration(): Promise<
    ApiConfiguration | undefined
  > {
    await this._load_promise
    return this._get_default_api_configuration_from_settings(
      'isDefaultForCodeAtCursor'
    )
  }

  public async set_default_code_at_cursor_api_configuration(
    api_configuration: ApiConfiguration | null
  ) {
    await this._set_default_api_configuration_in_settings(
      'isDefaultForCodeAtCursor',
      api_configuration
    )
  }

  public async get_default_patch_repair_api_configuration(): Promise<
    ApiConfiguration | undefined
  > {
    await this._load_promise
    return this._get_default_api_configuration_from_settings(
      'isDefaultForPatchRepair'
    )
  }

  public async set_default_patch_repair_api_configuration(
    api_configuration: ApiConfiguration | null
  ) {
    await this._set_default_api_configuration_in_settings(
      'isDefaultForPatchRepair',
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

  public async update_provider_name_in_api_configurations(params: {
    old_name: string
    new_name: string
  }): Promise<void> {
    const { old_name, new_name } = params
    const config = vscode.workspace.getConfiguration('codeWebChat')

    const configs = config.get<{ providerName: string }[]>('models', [])
    const updated_configs = configs.map((c) => {
      if (c.providerName == old_name) {
        return { ...c, providerName: new_name }
      }
      return c
    })
    await config.update(
      'models',
      updated_configs,
      vscode.ConfigurationTarget.Global
    )
  }
}
