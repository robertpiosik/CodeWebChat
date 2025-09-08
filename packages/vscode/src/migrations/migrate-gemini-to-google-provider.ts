import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'
import {
  DEFAULT_CODE_COMPLETIONS_CONFIGURATION_STATE_KEY,
  DEFAULT_COMMIT_MESSAGES_CONFIGURATION_STATE_KEY,
  DEFAULT_INTELLIGENT_UPDATE_CONFIGURATION_STATE_KEY,
  TOOL_CONFIG_CODE_COMPLETIONS_STATE_KEY,
  TOOL_CONFIG_COMMIT_MESSAGES_STATE_KEY,
  TOOL_CONFIG_EDIT_CONTEXT_STATE_KEY,
  TOOL_CONFIG_INTELLIGENT_UPDATE_STATE_KEY
} from '../constants/state-keys'

const MIGRATION_ID = 'gemini-to-google-provider-migration-202509032'
const SECRET_STORAGE_API_PROVIDERS_KEY = 'api-providers'

/**
 * Migration to rename Gemini provider to Google.
 * This migration runs only once per extension installation.
 */
export async function migrate_gemini_to_google_provider(
  context: vscode.ExtensionContext
): Promise<void> {
  try {
    if (context.globalState.get(MIGRATION_ID)) {
      return
    }

    const providers_json = await context.secrets.get(
      SECRET_STORAGE_API_PROVIDERS_KEY
    )

    let provider_was_migrated = false
    if (providers_json) {
      const providers = JSON.parse(providers_json) as any[]
      const migrated_providers = providers.map((provider) => {
        if (provider.type == 'built-in' && provider.name == 'Gemini') {
          provider_was_migrated = true
          return { ...provider, name: 'Google' }
        }
        return provider
      })

      if (provider_was_migrated) {
        await context.secrets.store(
          SECRET_STORAGE_API_PROVIDERS_KEY,
          JSON.stringify(migrated_providers)
        )
        Logger.info({
          function_name: 'migrate_gemini_to_google_provider',
          message: 'Successfully migrated Gemini provider to Google.'
        })
      }
    }

    const tool_config_keys = [
      TOOL_CONFIG_CODE_COMPLETIONS_STATE_KEY,
      TOOL_CONFIG_COMMIT_MESSAGES_STATE_KEY,
      TOOL_CONFIG_EDIT_CONTEXT_STATE_KEY,
      TOOL_CONFIG_INTELLIGENT_UPDATE_STATE_KEY
    ]

    for (const key of tool_config_keys) {
      const configs = context.globalState.get<any[]>(key, [])
      if (configs.length > 0) {
        const migrated_configs = configs.map((config) => {
          if (
            config.provider_type == 'built-in' &&
            config.provider_name == 'Gemini'
          ) {
            return { ...config, provider_name: 'Google' }
          }
          return config
        })
        await context.globalState.update(key, migrated_configs)
      }
    }

    const default_config_keys = [
      DEFAULT_CODE_COMPLETIONS_CONFIGURATION_STATE_KEY,
      DEFAULT_COMMIT_MESSAGES_CONFIGURATION_STATE_KEY,
      DEFAULT_INTELLIGENT_UPDATE_CONFIGURATION_STATE_KEY
    ]

    for (const key of default_config_keys) {
      const config = context.globalState.get<any>(key)
      if (
        config &&
        config.provider_type == 'built-in' &&
        config.provider_name == 'Gemini'
      ) {
        const migrated_config = { ...config, provider_name: 'Google' }
        await context.globalState.update(key, migrated_config)
      }
    }

    Logger.info({
      function_name: 'migrate_gemini_to_google_provider',
      message: 'Successfully migrated tool configs using Gemini provider.'
    })
    await context.globalState.update(MIGRATION_ID, true)
  } catch (error) {
    Logger.error({
      function_name: 'migrate_gemini_to_google_provider',
      message: 'Error migrating Gemini to Google provider',
      data: error instanceof Error ? error.message : String(error)
    })
  }
}
