import { config_cli_configuration_to_ui_format } from '@/utils/cli-configuration-format-converters'
import { PromptViewProvider } from '../prompt-view-provider'
import { create } from '@/views/shared/actions/agent/create'

export const handle_create_cli_configuration = async (
  provider: PromptViewProvider,
  message: any
): Promise<void> => {
  const result = await create({
    reference_index: message.reference_index,
    exact_insertion: message.exact_insertion
  })

  if (result) {
    provider.send_message({
      command: 'START_CLI_CONFIGURATION_CREATION',
      cli_configuration: config_cli_configuration_to_ui_format(result.config),
      insertion_index: result.insertion_index
    })
  }
}