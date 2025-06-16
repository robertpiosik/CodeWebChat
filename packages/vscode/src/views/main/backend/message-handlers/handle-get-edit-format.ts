import { MainViewProvider } from '@/views/main/backend/view-provider'
import { ExtensionMessage } from '@/views/main/types/messages'

export const handle_get_edit_format = (provider: MainViewProvider): void => {
  provider.send_message<ExtensionMessage>({
    command: 'EDIT_FORMAT',
    edit_format: provider.edit_format
  })
}
