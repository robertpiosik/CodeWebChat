import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import { handle_get_model_providers } from './handle-get-model-providers'
import { upsert_model_provider } from '../../../utils/upsert-model-provider'

export const handle_upsert_model_provider = async (params: {
  provider: SettingsProvider
  provider_name?: string
  insertion_index?: number
  create_on_top?: boolean
}): Promise<void> => {
  const { provider, provider_name, insertion_index, create_on_top } = params
  await upsert_model_provider({
    context: provider.context,
    provider_name,
    insertion_index,
    create_on_top
  })
  await handle_get_model_providers(provider)
}
