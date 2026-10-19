import { replace_changes_symbol } from '../utils/symbols/git/replace-git-symbols'
import { preview_text_in_temp_file } from '../utils/preview-text-in-temp-file'

export const handle_preview_changes_symbol = async (message: {
  branch_name: string
}) => {
  try {
    const instruction = `#Changes(${message.branch_name})`
    const { changes_definitions } = await replace_changes_symbol({
      instructions: [instruction]
    })

    if (changes_definitions) {
      await preview_text_in_temp_file({
        prefix: 'cwc-changes',
        content: changes_definitions.trim(),
        extension: '.md'
      })
    }
  } catch {}
}
