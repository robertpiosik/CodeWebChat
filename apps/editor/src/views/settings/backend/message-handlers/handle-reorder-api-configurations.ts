import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import { reorder_api_configurations } from '@/views/actions/reorder-api-configurations'

export const handle_reorder_api_configurations = async (
  provider: SettingsProvider,
  api_configurations: { id: string }[]
): Promise<void> => {
  const reordered_ids = api_configurations.map((p) => p.id)
  await reorder_api_configurations({ context: provider.context, reordered_ids })
}
