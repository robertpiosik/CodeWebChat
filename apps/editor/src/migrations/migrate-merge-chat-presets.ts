import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'

const MIGRATION_ID = 'merge-chat-presets-migration-2026060951'

function arePresetsIdentical(p1: any, p2: any): boolean {
  const c1 = { ...p1 }
  const c2 = { ...p2 }
  delete c1.name
  delete c1.promptPrefix
  delete c1.promptSuffix
  delete c2.name
  delete c2.promptPrefix
  delete c2.promptSuffix

  const stringify = (obj: any) => {
    if (!obj || typeof obj != 'object') return JSON.stringify(obj)
    const sortedKeys = Object.keys(obj).sort()
    const sortedObj: any = {}
    for (const key of sortedKeys) {
      sortedObj[key] = obj[key]
    }
    return JSON.stringify(sortedObj)
  }

  return stringify(c1) == stringify(c2)
}

export async function migrate_merge_chat_presets(
  context: vscode.ExtensionContext
): Promise<void> {
  try {
    if (context.globalState.get(MIGRATION_ID)) {
      return
    }

    const config = vscode.workspace.getConfiguration('codeWebChat')
    const preset_keys = [
      'chatPresetsForAskAboutContext',
      'chatPresetsForEditContext',
      'chatPresetsForCodeAtCursor',
      'chatPresetsForFindRelevantFiles',
      'chatPresetsForNoContext'
    ]

    const current_presets = config.inspect<any[]>('chatPresets')?.globalValue || []
    const final_presets = [...current_presets]
    const seen_names = new Set<string>(final_presets.map(p => p.name?.trim()).filter(Boolean))

    for (const key of preset_keys) {
      const presetsInspect = config.inspect<any[]>(key)
      if (
        presetsInspect?.globalValue &&
        Array.isArray(presetsInspect.globalValue)
      ) {
        for (const preset of presetsInspect.globalValue) {
          const base_name = preset.name?.trim()
          if (!base_name) continue
          
          if (final_presets.some(existing => arePresetsIdentical(existing, preset))) {
            continue
          }

          let name = base_name
          const match = base_name.match(/^(.*?)\s*\((\d+)\)$/)
          let prefix = base_name
          let num = 0
          let counter = 1

          if (match) {
            prefix = match[1]
            num = parseInt(match[2], 10)
          }

          while (seen_names.has(name)) {
            if (match) {
              num++
              name = prefix ? `${prefix} (${num})` : `(${num})`
            } else {
              name = `${base_name} (${counter})`
              counter++
            }
          }

          seen_names.add(name)
          const clean_preset = { ...preset, name }
          delete clean_preset.promptPrefix
          delete clean_preset.promptSuffix
          final_presets.push(clean_preset)
        }
      }
    }

    if (final_presets.length > current_presets.length) {
      await config.update(
        'chatPresets',
        final_presets,
        vscode.ConfigurationTarget.Global
      )
    }

    for (const key of preset_keys) {
      await config.update(key, undefined, vscode.ConfigurationTarget.Global)
    }

    await context.globalState.update(MIGRATION_ID, true)
    Logger.info({
      function_name: 'migrate_merge_chat_presets',
      message: 'Successfully merged chat presets into a single list'
    })
  } catch (error) {
    Logger.error({
      function_name: 'migrate_merge_chat_presets',
      message: 'Error merging chat presets',
      data: error instanceof Error ? error.message : String(error)
    })
  }
}