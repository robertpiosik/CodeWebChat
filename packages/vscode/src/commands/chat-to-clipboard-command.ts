import * as vscode from 'vscode'
import { FilesCollector } from '../utils/files-collector'
import { EditFormat } from '@shared/types/edit-format'
import { at_sign_quick_pick } from '../utils/at-sign-quick-pick'
import { replace_selection_placeholder } from '../utils/replace-selection-placeholder'
import { replace_saved_context_placeholder } from '../utils/replace-saved-context-placeholder'
import { replace_changes_placeholder } from '../utils/replace-changes-placeholder'

async function handle_at_sign_in_chat_input(
  input_box: vscode.InputBox,
  current_value: string,
  cursor_position: number,
  context: vscode.ExtensionContext
): Promise<string | undefined> {
  input_box.hide()

  const replacement = await at_sign_quick_pick(context)

  if (!replacement) {
    input_box.show()
    input_box.valueSelection = [cursor_position, cursor_position]
    return current_value
  }

  const is_after_at_sign = current_value.slice(0, cursor_position).endsWith('@')
  const text_to_insert = is_after_at_sign ? replacement : `@${replacement}`

  const new_value =
    current_value.slice(0, cursor_position) +
    text_to_insert +
    current_value.slice(cursor_position)

  await context.workspaceState.update('last-chat-prompt', new_value)

  return new_value
}

export function edit_context_to_clipboard_command(
  context: vscode.ExtensionContext,
  file_tree_provider: any,
  open_editors_provider?: any
) {
  return vscode.commands.registerCommand(
    'codeWebChat.editContextToClipboard',
    async () => {
      const last_chat_prompt =
        context.workspaceState.get<string>('last-chat-prompt') || ''

      const input_box = vscode.window.createInputBox()
      input_box.placeholder = 'Type something'
      input_box.value = last_chat_prompt

      let current_cursor_position = last_chat_prompt.length
      let previous_value = last_chat_prompt
      let is_handling_at_sign = false

      input_box.onDidChangeValue(async (value) => {
        if (is_handling_at_sign) {
          return
        }

        await context.workspaceState.update('last-chat-prompt', value)

        const typed_at_sign =
          value.endsWith('@') && value.length + 1 != previous_value.length

        if (typed_at_sign) {
          is_handling_at_sign = true
          current_cursor_position = value.length

          const new_value = await handle_at_sign_in_chat_input(
            input_box,
            value,
            current_cursor_position,
            context
          )

          if (new_value !== undefined && new_value !== value) {
            input_box.value = new_value
            current_cursor_position = new_value.length
            setTimeout(() => {
              input_box.valueSelection = [
                current_cursor_position,
                current_cursor_position
              ]
            }, 0)
          }

          input_box.show()
          is_handling_at_sign = false
        }

        previous_value = value
      })

      let instructions = await new Promise<string | undefined>((resolve) => {
        input_box.onDidAccept(() => {
          resolve(input_box.value)
          input_box.hide()
        })
        input_box.onDidHide(() => {
          if (!is_handling_at_sign) {
            resolve(undefined)
          }
        })
        input_box.show()
      })

      if (!instructions) {
        return
      }

      if (instructions.includes('@Selection')) {
        instructions = replace_selection_placeholder(instructions)
      }

      let pre_context_instructions = instructions
      let post_context_instructions = instructions

      if (pre_context_instructions.includes('@Changes:')) {
        pre_context_instructions = await replace_changes_placeholder(
          pre_context_instructions
        )
      }

      if (pre_context_instructions.includes('@SavedContext:')) {
        pre_context_instructions = await replace_saved_context_placeholder(
          pre_context_instructions,
          context,
          file_tree_provider
        )
      }

      const files_collector = new FilesCollector(
        file_tree_provider,
        open_editors_provider
      )
      let context_text = ''

      try {
        context_text = await files_collector.collect_files()
      } catch (error: any) {
        console.error('Error collecting files:', error)
        vscode.window.showErrorMessage(
          'Error collecting files: ' + error.message
        )
        return
      }

      const edit_format = context.workspaceState.get<EditFormat>(
        'editFormat',
        'truncated'
      )
      const edit_format_instructions = vscode.workspace
        .getConfiguration('codeWebChat')
        .get<string>(
          `editFormatInstructions${
            edit_format.charAt(0).toUpperCase() + edit_format.slice(1)
          }`
        )

      if (edit_format_instructions && context_text) {
        pre_context_instructions += `\n${edit_format_instructions}`
        post_context_instructions += `\n${edit_format_instructions}`
      }

      const text = context_text
        ? `${pre_context_instructions}\n<files>\n${context_text}</files>\n${post_context_instructions}`
        : pre_context_instructions

      await vscode.env.clipboard.writeText(text)
      vscode.window.showInformationMessage('Chat prompt copied to clipboard!')
    }
  )
}
