import * as vscode from 'vscode'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { dictionary } from '@shared/constants/dictionary'
import { DuplicatePresetGroupOrSeparatorMessage } from '@/views/panel/types/messages'
import { ConfigPresetFormat } from '@/views/panel/backend/utils/preset-format-converters'

function generate_unique_name(
  base_name: string | undefined,
  all_presets: ConfigPresetFormat[]
): string {
  const preset_name = base_name ?? ''

  const parenthetical_match = preset_name.match(/^(.*?)(?:\s*\((\d+)\))?$/)
  const original_base_name = parenthetical_match?.[1]?.trim()
  const existing_number_str = parenthetical_match?.[2]

  const base_for_duplication =
    existing_number_str !== undefined && original_base_name !== undefined
      ? original_base_name
      : preset_name.trim()

  let copy_number =
    existing_number_str !== undefined
      ? parseInt(existing_number_str, 10) + 1
      : 1

  let new_name = base_for_duplication
    ? `${base_for_duplication} (${copy_number})`
    : `(${copy_number})`

  while (all_presets.some((p) => p.name == new_name)) {
    copy_number++
    new_name = base_for_duplication
      ? `${base_for_duplication} (${copy_number})`
      : `(${copy_number})`
  }
  return new_name
}
export const handle_duplicate_preset_group_or_separator = async (
  panel_provider: PanelProvider,
  message: DuplicatePresetGroupOrSeparatorMessage,
  webview_view: vscode.WebviewView
): Promise<void> => {
  const original_index = message.index
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const presets_config_key = panel_provider.get_presets_config_key()
  const current_presets =
    config.get<ConfigPresetFormat[]>(presets_config_key, []) || []

  if (original_index < 0 || original_index >= current_presets.length) {
    vscode.window.showErrorMessage(
      dictionary.error_message.PRESET_NOT_FOUND(`at index ${original_index}`)
    )
    return
  }

  const preset_to_duplicate = current_presets[original_index]

  const is_group = !preset_to_duplicate.chatbot && preset_to_duplicate.name
  if (is_group) {
    const items_to_duplicate_from = [preset_to_duplicate]
    let end_of_group_index = original_index

    for (let i = original_index + 1; i < current_presets.length; i++) {
      const item = current_presets[i]
      if (!item.chatbot && item.name) {
        break
      }
      items_to_duplicate_from.push(item)
      end_of_group_index = i
      if (!item.chatbot && !item.name) {
        break
      }
    }

    const duplicated_items: ConfigPresetFormat[] = []
    const temporary_preset_list = [...current_presets]

    for (const item of items_to_duplicate_from) {
      if (item.name) {
        const new_name = generate_unique_name(item.name, temporary_preset_list)
        const duplicated_item = { ...item, name: new_name, isPinned: false }
        duplicated_items.push(duplicated_item)
        temporary_preset_list.push(duplicated_item)
      } else {
        duplicated_items.push({ ...item })
      }
    }

    const updated_presets = [...current_presets]
    updated_presets.splice(end_of_group_index + 1, 0, ...duplicated_items)

    try {
      await config.update(presets_config_key, updated_presets, true)
      panel_provider.send_presets_to_webview(webview_view.webview)
    } catch (error) {
      vscode.window.showErrorMessage(
        dictionary.error_message.FAILED_TO_DUPLICATE_PRESET(error)
      )
    }
    return
  }

  if (!preset_to_duplicate.chatbot && !preset_to_duplicate.name) {
    const duplicated_preset = { ...preset_to_duplicate }
    const updated_presets = [...current_presets]
    updated_presets.splice(original_index + 1, 0, duplicated_preset)

    try {
      await config.update(presets_config_key, updated_presets, true)
      panel_provider.send_presets_to_webview(webview_view.webview)
    } catch (error) {
      vscode.window.showErrorMessage(
        dictionary.error_message.FAILED_TO_DUPLICATE_PRESET(error)
      )
    }
    return
  }

  const new_name = generate_unique_name(
    preset_to_duplicate.name,
    current_presets
  )

  const duplicated_preset = {
    ...preset_to_duplicate,
    name: new_name
  }

  const updated_presets = [...current_presets]
  updated_presets.splice(original_index + 1, 0, duplicated_preset)

  try {
    await config.update(presets_config_key, updated_presets, true)
    panel_provider.send_presets_to_webview(webview_view.webview)
  } catch (error) {
    vscode.window.showErrorMessage(
      dictionary.error_message.FAILED_TO_DUPLICATE_PRESET(error)
    )
  }
}
