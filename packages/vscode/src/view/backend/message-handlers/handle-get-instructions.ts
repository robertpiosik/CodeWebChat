import { ViewProvider } from '@/view/backend/view-provider'
import { ExtensionMessage } from '@/view/types/messages'

export const handle_get_instructions = (provider: ViewProvider): void => {
  provider.send_message<ExtensionMessage>({
    command: 'INSTRUCTIONS',
    ask: provider.ask_instructions,
    edit_context: provider.edit_instructions,
    no_context: provider.no_context_instructions,
    code_completions: provider.code_completions_instructions
  })
}
