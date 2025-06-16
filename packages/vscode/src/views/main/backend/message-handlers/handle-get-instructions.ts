import { MainViewProvider } from '@/views/main/backend/view-provider'
import { ExtensionMessage } from '@/views/main/types/messages'

export const handle_get_instructions = (provider: MainViewProvider): void => {
  provider.send_message<ExtensionMessage>({
    command: 'INSTRUCTIONS',
    value: provider.instructions
  })
}
