import * as vscode from 'vscode'
import { Logger } from '../helpers/logger'

const OLD_SYSTEM_INSTRUCTIONS = `You're a helpful coding assistant. Whenever proposing a file use the file block syntax.
Files must be represented as code blocks with their \`name\` in the header.
Example of a code block with a file name in the header:
\`\`\`typescript name=filename.ts
contents of file
\`\`\``

const NEW_SYSTEM_INSTRUCTIONS = `You're a helpful coding assistant. Whenever proposing a file use the file block syntax.
Files must be represented as code blocks with their \`name\` in the first line.
Example of a code block with a file name in the first line:
\`\`\`typescript
// filename.ts
contents of file
\`\`\``

type Preset = {
  name: string
  chatbot: string
  systemInstructions?: string
  [key: string]: any
}

/**
 * Migrates presets in settings.json to use new file block syntax format
 */
export async function migrate_system_instructions(): Promise<void> {
  try {
    const config = vscode.workspace.getConfiguration('geminiCoder')
    const presets: Preset[] = config.get('presets') || []

    // Check if migration is needed
    const needs_migration = presets.some(
      (preset) => preset.systemInstructions == OLD_SYSTEM_INSTRUCTIONS
    )

    if (!needs_migration) {
      return
    }

    // Update presets with old system instructions
    const updated_presets = presets.map((preset) => {
      if (preset.systemInstructions == OLD_SYSTEM_INSTRUCTIONS) {
        return {
          ...preset,
          systemInstructions: NEW_SYSTEM_INSTRUCTIONS
        }
      }
      return preset
    })

    // Update configuration
    await config.update(
      'presets',
      updated_presets,
      vscode.ConfigurationTarget.Global
    )

    Logger.log({
      function_name: 'migrate_system_instructions',
      message: 'Successfully migrated system instructions in presets'
    })
  } catch (error) {
    Logger.error({
      function_name: 'migrate_system_instructions',
      message: 'Error migrating system instructions',
      data: error
    })
  }
}
