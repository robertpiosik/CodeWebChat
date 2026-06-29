import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import { handle_get_model_providers } from './handle-get-model-providers'
import { upsert_provider } from '../../../shared/actions/api/upsert-provider'

export const handle_upsert_model_provider = async (params: {
  provider: SettingsProvider
  provider_name?: string
  insertion_index?: number
  create_on_top?: boolean
}): Promise<void> => {
  await upsert_provider({
    context: params.provider.context,
    model_provider_name: params.provider_name,
    insertion_index: params.insertion_index,
    create_on_top: params.create_on_top
  })
  await handle_get_model_providers(params.provider)
}
