import { SettingsViewProvider } from '../settings-view-provider'
import { hash_sign_quick_pick } from '@/views/shared/utils/hash-sign-quick-pick'
import { ShowHashSignQuickPickMessage } from '@/views/settings/types/messages'

export const handle_hash_sign_quick_pick = async (
  provider: SettingsViewProvider,
  message: ShowHashSignQuickPickMessage
): Promise<void> => {
  const on_insert = (text: string) => {
    provider.postMessage({
      command: 'INSERT_SYMBOL',
      text
    })
  }

  const replacement = await hash_sign_quick_pick({
    extension_context: provider.extension_context,
    on_insert,
    include: message.include
  })

  if (replacement) {
    on_insert(replacement)
  }
}
