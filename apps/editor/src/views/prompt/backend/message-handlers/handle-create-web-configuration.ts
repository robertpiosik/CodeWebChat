import { config_web_configuration_to_ui_format } from '@/utils/web-configuration-format-converters'
import { PromptViewProvider } from '../prompt-view-provider'
import { create } from '@/views/shared/actions/web/create'

export const handle_create_web_configuration = async (
  provider: PromptViewProvider,
  message: any
): Promise<void> => {
  const result = await create({
    reference_index: message.reference_index
  })

  if (result) {
    provider.send_message({
      command: 'START_WEB_CONFIGURATION_CREATION',
      web_configuration: config_web_configuration_to_ui_format(result.config),
      insertion_index: result.insertion_index
    })
  }
}
