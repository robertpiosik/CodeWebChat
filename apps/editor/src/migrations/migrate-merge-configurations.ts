import * as vscode from 'vscode'
import { Logger } from '@shared/utils/logger'

const MIGRATION_ID = 'merge-configurations-migration-20260311'

export async function migrate_merge_configurations(
  context: vscode.ExtensionContext
): Promise<void> {
  try {
    if (context.globalState.get(MIGRATION_ID)) {
      return
    }

    const config = vscode.workspace.getConfiguration('codeWebChat')

    const editContextInspect = config.inspect<any[]>(
      'configurationsForEditContext'
    )
    const codeAtCursorInspect = config.inspect<any[]>(
      'configurationsForCodeAtCursor'
    )
    const findRelevantFilesInspect = config.inspect<any[]>(
      'configurationsForFindRelevantFiles'
    )
    const intelligentUpdateInspect = config.inspect<any[]>(
      'configurationsForIntelligentUpdate'
    )
    const commitMessagesInspect = config.inspect<any[]>(
      'configurationsForCommitMessages'
    )
    const voiceInputInspect = config.inspect<any[]>(
      'configurationsForVoiceInput'
    )

    const mergedConfigs: any[] = []

    const addConfig = (sourceConfig: any, sourceKey: string) => {
      let existing = mergedConfigs.find(
        (c) =>
          c.providerName === sourceConfig.providerName &&
          c.model === sourceConfig.model &&
          c.temperature === sourceConfig.temperature &&
          c.reasoningEffort === sourceConfig.reasoningEffort &&
          c.systemInstructionsOverride ===
            sourceConfig.systemInstructionsOverride
      )

      if (!existing) {
        existing = {
          providerName: sourceConfig.providerName,
          model: sourceConfig.model
        }
        if (sourceConfig.temperature !== undefined)
          existing.temperature = sourceConfig.temperature
        if (sourceConfig.reasoningEffort !== undefined)
          existing.reasoningEffort = sourceConfig.reasoningEffort
        if (sourceConfig.systemInstructionsOverride !== undefined)
          existing.systemInstructionsOverride =
            sourceConfig.systemInstructionsOverride
        if (sourceConfig.isPinned !== undefined)
          existing.isPinned = sourceConfig.isPinned

        mergedConfigs.push(existing)
      } else {
        if (sourceConfig.isPinned) existing.isPinned = true
      }

      if (sourceConfig.isDefault) {
        if (sourceKey === 'configurationsForCodeAtCursor')
          existing.isDefaultForCodeAtCursor = true
        if (sourceKey === 'configurationsForFindRelevantFiles')
          existing.isDefaultForFindRelevantFiles = true
        if (sourceKey === 'configurationsForIntelligentUpdate')
          existing.isDefaultForIntelligentUpdate = true
        if (sourceKey === 'configurationsForCommitMessages')
          existing.isDefaultForCommitMessages = true
        if (sourceKey === 'configurationsForVoiceInput')
          existing.isDefaultForVoiceInput = true
      }
    }

    const processSource = (inspect: any, key: string) => {
      if (inspect?.globalValue && Array.isArray(inspect.globalValue)) {
        for (const c of inspect.globalValue) {
          addConfig(c, key)
        }
      }
    }

    processSource(editContextInspect, 'configurationsForEditContext')
    processSource(codeAtCursorInspect, 'configurationsForCodeAtCursor')
    processSource(
      findRelevantFilesInspect,
      'configurationsForFindRelevantFiles'
    )
    processSource(
      intelligentUpdateInspect,
      'configurationsForIntelligentUpdate'
    )
    processSource(commitMessagesInspect, 'configurationsForCommitMessages')
    processSource(voiceInputInspect, 'configurationsForVoiceInput')

    if (mergedConfigs.length > 0) {
      // Check if there are existing unified configs
      const existingConfigsInspect = config.inspect<any[]>('configurations')
      if (
        existingConfigsInspect?.globalValue &&
        Array.isArray(existingConfigsInspect.globalValue)
      ) {
        for (const c of existingConfigsInspect.globalValue) {
          addConfig(c, 'configurations')
        }
      }

      await config.update(
        'configurations',
        mergedConfigs,
        vscode.ConfigurationTarget.Global
      )
    }

    // Clear old configs
    if (editContextInspect?.globalValue !== undefined)
      await config.update(
        'configurationsForEditContext',
        undefined,
        vscode.ConfigurationTarget.Global
      )
    if (codeAtCursorInspect?.globalValue !== undefined)
      await config.update(
        'configurationsForCodeAtCursor',
        undefined,
        vscode.ConfigurationTarget.Global
      )
    if (findRelevantFilesInspect?.globalValue !== undefined)
      await config.update(
        'configurationsForFindRelevantFiles',
        undefined,
        vscode.ConfigurationTarget.Global
      )
    if (intelligentUpdateInspect?.globalValue !== undefined)
      await config.update(
        'configurationsForIntelligentUpdate',
        undefined,
        vscode.ConfigurationTarget.Global
      )
    if (commitMessagesInspect?.globalValue !== undefined)
      await config.update(
        'configurationsForCommitMessages',
        undefined,
        vscode.ConfigurationTarget.Global
      )
    if (voiceInputInspect?.globalValue !== undefined)
      await config.update(
        'configurationsForVoiceInput',
        undefined,
        vscode.ConfigurationTarget.Global
      )

    await context.globalState.update(MIGRATION_ID, true)

    Logger.info({
      function_name: 'migrate_merge_configurations',
      message: 'Successfully merged configurations'
    })
  } catch (error) {
    Logger.error({
      function_name: 'migrate_merge_configurations',
      message: 'Error merging configurations',
      data: error instanceof Error ? error.message : String(error)
    })
  }
}
