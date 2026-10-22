import * as vscode from 'vscode'
import { TestProviderConnectionMessage } from '@/views/settings/types/messages'
import { ModelFetcher } from '@/services/model-fetcher'
import { t } from '@/i18n'
import { SettingsViewProvider } from '../settings-view-provider'
import { ProvidersManager } from '@/services/providers-manager'

export const handle_test_provider_connection = async (
  provider: SettingsViewProvider,
  message: TestProviderConnectionMessage
): Promise<void> => {
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: t(
        'views.settings.handlers.handle-test-provider-connection.testing'
      ),
      cancellable: false
    },
    async () => {
      try {
        const normalize_base_url = (url: string): string => {
          return url.trim().replace(/\/+$/, '')
        }

        const base_url = normalize_base_url(message.base_url)
        if (!base_url) {
          throw new Error('Base URL is required')
        }

        let api_key = message.api_key
        if (!api_key && !message.is_api_key_cleared && message.original_name) {
          const providers_manager = new ProvidersManager(
            provider.extension_context
          )
          const existing = await providers_manager.get_provider(
            message.original_name
          )
          if (existing) {
            api_key = existing.api_key
          }
        }

        const fetcher = new ModelFetcher()
        await fetcher.get_models({
          base_url,
          api_key: api_key
        })
        vscode.window.showInformationMessage(
          t('views.settings.handlers.handle-test-provider-connection.success')
        )
      } catch (error: any) {
        vscode.window.showErrorMessage(
          t('views.settings.handlers.handle-test-provider-connection.failure', {
            error: error.message
          })
        )
      }
    }
  )
}