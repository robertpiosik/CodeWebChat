import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'
import { SECRET_STORAGE_MODEL_PROVIDERS_KEY } from '@/constants/secret-storage-keys'

const MIGRATION_ID = 'state-to-settings-migration-20251003'

const TOOL_CONFIG_CODE_COMPLETIONS_STATE_KEY = 'toolConfigCodeCompletions'
const TOOL_CONFIG_EDIT_CONTEXT_STATE_KEY = 'toolConfigFileRefactoring'
const TOOL_CONFIG_INTELLIGENT_UPDATE_STATE_KEY = 'toolConfigIntelligentUpdate'
const TOOL_CONFIG_COMMIT_MESSAGES_STATE_KEY = 'toolConfigCommitMessages'
const DEFAULT_CODE_COMPLETIONS_CONFIGURATION_STATE_KEY =
  'defaultCodeCompletionsConfiguration'
const DEFAULT_INTELLIGENT_UPDATE_CONFIGURATION_STATE_KEY =
  'defaultIntelligentUpdateConfiguration'
const DEFAULT_COMMIT_MESSAGES_CONFIGURATION_STATE_KEY =
  'defaultCommitMessagesConfiguration'

type OldProvider = {
  type: 'built-in' | 'custom'
  name: string
  base_url?: string
  api_key: string
}

type NewProvider = {
  type: 'built-in' | 'custom'
  name: string
  baseUrl?: string
}

type OldToolConfig = {
  provider_type: string
  provider_name: string
  model: string
  temperature: number
  reasoning_effort?: string
  max_concurrency?: number
  instructions_placement?: string
}

type NewToolConfig = {
  providerName: string
  model: string
  temperature?: number
  reasoningEffort?: string
  isDefault?: boolean
  maxConcurrency?: number
  instructionsPlacement?: string
}

async function migrateProviders(context: vscode.ExtensionContext) {
  const providersJson = await context.secrets.get(
    SECRET_STORAGE_MODEL_PROVIDERS_KEY
  )
  if (!providersJson) return

  const oldProviders: OldProvider[] = JSON.parse(providersJson)
  if (oldProviders.length === 0) return

  const newProviders: NewProvider[] = oldProviders.map(
    ({ base_url, ...rest }) => ({
      ...rest,
      ...(rest.type == 'custom' && base_url && { baseUrl: base_url })
    })
  )

  const config = vscode.workspace.getConfiguration('codeWebChat')
  await config.update(
    'modelProviders',
    newProviders,
    vscode.ConfigurationTarget.Global
  )
}

function transformToolConfig(
  oldConfig: OldToolConfig,
  isDefault: boolean
): NewToolConfig {
  const newConfig: NewToolConfig = {
    providerName: oldConfig.provider_name,
    model: oldConfig.model
  }
  if (oldConfig.temperature !== undefined) {
    newConfig.temperature = oldConfig.temperature
  }
  if (oldConfig.reasoning_effort !== undefined) {
    newConfig.reasoningEffort = oldConfig.reasoning_effort
  }
  if (isDefault) {
    newConfig.isDefault = true
  }
  if (oldConfig.max_concurrency !== undefined) {
    newConfig.maxConcurrency = oldConfig.max_concurrency
  }
  if (oldConfig.instructions_placement !== undefined) {
    newConfig.instructionsPlacement = oldConfig.instructions_placement
  }
  return newConfig
}

async function migrateToolConfigs(
  context: vscode.ExtensionContext,
  {
    stateKey,
    defaultStateKey,
    settingsKey
  }: {
    stateKey: string
    defaultStateKey?: string
    settingsKey: string
  }
) {
  const oldConfigs =
    context.globalState.get<OldToolConfig[]>(stateKey, []) ?? []
  if (oldConfigs.length === 0) return

  const defaultConfig = defaultStateKey
    ? context.globalState.get<OldToolConfig>(defaultStateKey)
    : undefined

  const newConfigs = oldConfigs.map((c) => {
    const isDefault =
      !!defaultConfig &&
      defaultConfig.provider_name === c.provider_name &&
      defaultConfig.model === c.model
    return transformToolConfig(c, isDefault)
  })

  // If default config was set, but not in the list of configs, add it.
  if (defaultConfig && !newConfigs.some((c) => c.isDefault)) {
    const existingConfigIndex = newConfigs.findIndex(
      (c) =>
        c.providerName === defaultConfig.provider_name &&
        c.model === defaultConfig.model
    )
    if (existingConfigIndex > -1) {
      newConfigs[existingConfigIndex].isDefault = true
    } else {
      newConfigs.push(transformToolConfig(defaultConfig, true))
    }
  }

  const config = vscode.workspace.getConfiguration('codeWebChat')
  await config.update(
    settingsKey,
    newConfigs,
    vscode.ConfigurationTarget.Global
  )

  await context.globalState.update(stateKey, undefined)
  if (defaultStateKey) {
    await context.globalState.update(defaultStateKey, undefined)
  }
}

export async function migrate_state_to_settings(
  context: vscode.ExtensionContext
): Promise<void> {
  if (context.globalState.get(MIGRATION_ID)) {
    return
  }

  try {
    await migrateProviders(context)

    await migrateToolConfigs(context, {
      stateKey: TOOL_CONFIG_CODE_COMPLETIONS_STATE_KEY,
      defaultStateKey: DEFAULT_CODE_COMPLETIONS_CONFIGURATION_STATE_KEY,
      settingsKey: 'configurationsForCodeCompletions'
    })

    await migrateToolConfigs(context, {
      stateKey: TOOL_CONFIG_EDIT_CONTEXT_STATE_KEY,
      settingsKey: 'configurationsForEditContext'
    })

    await migrateToolConfigs(context, {
      stateKey: TOOL_CONFIG_INTELLIGENT_UPDATE_STATE_KEY,
      defaultStateKey: DEFAULT_INTELLIGENT_UPDATE_CONFIGURATION_STATE_KEY,
      settingsKey: 'configurationsForIntelligentUpdate'
    })

    await migrateToolConfigs(context, {
      stateKey: TOOL_CONFIG_COMMIT_MESSAGES_STATE_KEY,
      defaultStateKey: DEFAULT_COMMIT_MESSAGES_CONFIGURATION_STATE_KEY,
      settingsKey: 'configurationsForCommitMessages'
    })

    await context.globalState.update(MIGRATION_ID, true)
    Logger.info({
      function_name: 'migrate_state_to_settings',
      message: 'Successfully migrated state and secrets to settings.json'
    })
  } catch (error) {
    Logger.error({
      function_name: 'migrate_state_to_settings',
      message: 'Error migrating state and secrets to settings.json',
      data: error instanceof Error ? error.message : String(error)
    })
  }
}
