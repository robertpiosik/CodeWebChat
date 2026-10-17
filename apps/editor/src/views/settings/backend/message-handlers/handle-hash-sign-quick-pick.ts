import { SettingsViewProvider } from '../settings-view-provider'
import { hash_sign_quick_pick } from '@/views/shared/utils/hash-sign-quick-pick'

export const handle_hash_sign_quick_pick = async (
  provider: SettingsViewProvider
): Promise<void> => {
  const on_insert = (text: string) => {
    provider.postMessage({
      command: 'INSERT_SYMBOL',
      text
    })
  }

  const replacement = await hash_sign_quick_pick({
    extension_context: provider.extension_context,
    on_insert
  })

  if (replacement) {
    on_insert(replacement)
  }
}
