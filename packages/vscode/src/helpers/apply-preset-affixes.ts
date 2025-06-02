import * as vscode from 'vscode'

export function get_presets_by_names(preset_names: string[]): Array<{
  name: string
  prompt_prefix?: string
  prompt_suffix?: string
}> {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const all_presets = config.get<any[]>('presets', [])

  return all_presets
    .filter((preset) => preset_names.includes(preset.name))
    .map((preset) => ({
      name: preset.name,
      prompt_prefix: preset.promptPrefix,
      prompt_suffix: preset.promptSuffix
    }))
}

export function apply_preset_affixes_to_instruction(
  instruction: string,
  preset_name: string
): string {
  const presets = get_presets_by_names([preset_name])
  if (presets.length > 0) {
    const preset = presets[0]
    let result = instruction
    if (preset.prompt_prefix) {
      result = `${preset.prompt_prefix} ${result}`
    }
    if (preset.prompt_suffix) {
      result = `${result} ${preset.prompt_suffix}`
    }
    return result
  }
  return instruction
}
