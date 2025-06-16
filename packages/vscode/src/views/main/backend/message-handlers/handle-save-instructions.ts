import { MainViewProvider } from '@/views/main/backend/view-provider'
import { SaveInstructionsMessage } from '@/views/main/types/messages'

export const handle_save_instructions = async (
  provider: MainViewProvider,
  message: SaveInstructionsMessage
): Promise<void> => {
  provider.instructions = message.instruction
  await provider.context.workspaceState.update(
    'instructions',
    message.instruction
  )
}
