import { ConfigPresetFormat } from '@/view/backend/helpers/preset-format-converters'
import * as vscode from 'vscode'

export function apply_preset_affixes_to_instruction(
  instruction: string,
  preset_name: string,
  presets_config_key: string,
  override_affixes?: { promptPrefix?: string; promptSuffix?: string }
): string {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const all_presets = config.get<ConfigPresetFormat[]>(presets_config_key, [])

  const preset_index = all_presets.findIndex(
    (preset) => preset.name === preset_name
  )

  const preset = preset_index !== -1 ? all_presets[preset_index] : undefined

  // Find at most one grouping element defined above in the list that doesn't have "chatbot" set.
  let grouping_preset: ConfigPresetFormat | undefined = undefined
  if (preset_index !== -1) {
    for (let i = preset_index - 1; i >= 0; i--) {
      const p = all_presets[i]
      if (!p.chatbot) {
        grouping_preset = p
        break // Found the closest one, stop searching.
      }
    }
  }

  const current_preset_prefix =
    override_affixes?.promptPrefix ?? preset?.promptPrefix
  const current_preset_suffix =
    override_affixes?.promptSuffix ?? preset?.promptSuffix

  const prefixes: string[] = [
    grouping_preset?.promptPrefix,
    current_preset_prefix
  ].filter((p): p is string => !!p)

  const suffixes: string[] = [
    current_preset_suffix,
    grouping_preset?.promptSuffix
  ].filter((s): s is string => !!s)

  const final_prefix = prefixes.join(' ')
  const final_suffix = suffixes.join(' ')

  let result = instruction
  if (final_prefix) {
    result = `${final_prefix} ${result}`
  }
  if (final_suffix) {
    result = `${result} ${final_suffix}`
  }

  return result
}
