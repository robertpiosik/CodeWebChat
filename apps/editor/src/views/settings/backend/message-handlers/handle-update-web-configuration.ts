import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import { UpdateWebConfigurationMessage } from '@/views/settings/types/messages'
import { update_web_configuration } from '@/views/actions/update-web-configuration'

export const handle_update_web_configuration = async (
  settings_provider: SettingsProvider,
  message: UpdateWebConfigurationMessage
): Promise<void> => {
  const result = await update_web_configuration({
    updating_web_configuration: message.updating_web_configuration,
    updated_web_configuration: message.updated_web_configuration,
    origin: message.origin
  })

  if (result.success) {
    settings_provider.postMessage({
      command: 'WEB_CONFIGURATION_UPDATED'
    })
  }
}
