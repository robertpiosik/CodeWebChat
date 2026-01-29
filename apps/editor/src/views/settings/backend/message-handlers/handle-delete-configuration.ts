import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import { delete_configuration } from '../../../utils/delete-configuration'

export const handle_delete_configuration = async (
  provider: SettingsProvider,
  configuration_id: string,
  type:
    | 'code-completions'
    | 'edit-context'
    | 'intelligent-update'
    | 'commit-messages'
    | 'prune-context'
): Promise<void> => {
  await delete_configuration(provider.context, configuration_id, type)
}
