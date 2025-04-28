import * as vscode from 'vscode'

/**
 * Gets presets by their names from configuration
 */
export function get_presets_by_names(preset_names: string[]): Array<{
  name: string
  prompt_prefix?: string
  prompt_suffix?: string
}> {
  const config = vscode.workspace.getConfiguration()
  const all_presets = config.get<any[]>('geminiCoder.presets', [])

  return all_presets
    .filter((preset) => preset_names.includes(preset.name))
    .map((preset) => ({
      name: preset.name,
      prompt_prefix: preset.promptPrefix,
      prompt_suffix: preset.promptSuffix
    }))
}

/**
 * Applies the prefixes and suffixes from the selected presets to the instruction
 */
export function apply_preset_affixes_to_instruction(
  instruction: string,
  preset_names: string[]
): string {
  const presets = get_presets_by_names(preset_names)

  // Apply prefixes and suffixes for all selected presets
  if (presets.length == 0) {
    return instruction
  }

  // For multiple presets, we apply the first preset's prefixes and suffixes
  // Future enhancement could handle multiple presets differently
  const preset = presets[0]

  let modified_instruction = instruction

  if (preset.prompt_prefix) {
    modified_instruction = `${preset.prompt_prefix} ${modified_instruction}`
  }

  if (preset.prompt_suffix) {
    modified_instruction = `${modified_instruction} ${preset.prompt_suffix}`
  }

  return modified_instruction
}
