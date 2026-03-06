import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'
import { PROVIDERS } from '../constants/providers'
import { SECRET_STORAGE_MODEL_PROVIDERS_KEY } from '@/constants/secret-storage-keys'

const MIGRATION_ID = 'model-providers-type-migration-20260305'

export async function migrate_model_providers_type(
  context: vscode.ExtensionContext
): Promise<void> {
  try {
    if (context.globalState.get(MIGRATION_ID)) {
      return
    }

    const config = vscode.workspace.getConfiguration('codeWebChat')
    const old_providers = config.get<any[]>('modelProviders', [])

    let modified = false
    const new_providers = old_providers.map((p) => {
      if (p.type == 'built-in') {
        modified = true
        const base_url =
          PROVIDERS[p.name as keyof typeof PROVIDERS]?.base_url || ''
        return {
          name: p.name,
          baseUrl: base_url
        }
      } else if (p.type == 'custom') {
        modified = true
        return {
          name: p.name,
          baseUrl: p.baseUrl
        }
      }
      return p
    })

    if (modified) {
      await config.update(
        'modelProviders',
        new_providers,
        vscode.ConfigurationTarget.Global
      )
    }

    const secrets_json = await context.secrets.get(
      SECRET_STORAGE_MODEL_PROVIDERS_KEY
    )
    if (secrets_json) {
      let secrets_modified = false
      const secrets = JSON.parse(secrets_json) as any[]
      const new_secrets = secrets.map((p) => {
        if (p.type) {
          secrets_modified = true
          const base_url =
            p.type == 'built-in'
              ? PROVIDERS[p.name as keyof typeof PROVIDERS]?.base_url || ''
              : p.base_url

          return {
            name: p.name,
            base_url,
            api_key: p.api_key || ''
          }
        }
        return p
      })
      if (secrets_modified) {
        await context.secrets.store(
          SECRET_STORAGE_MODEL_PROVIDERS_KEY,
          JSON.stringify(new_secrets)
        )
      }
    }

    await context.globalState.update(MIGRATION_ID, true)
    Logger.info({
      function_name: 'migrate_model_providers_type',
      message: 'Successfully migrated model providers type structure'
    })
  } catch (error) {
    Logger.error({
      function_name: 'migrate_model_providers_type',
      message: 'Error migrating model providers type',
      data: error instanceof Error ? error.message : String(error)
    })
  }
}
