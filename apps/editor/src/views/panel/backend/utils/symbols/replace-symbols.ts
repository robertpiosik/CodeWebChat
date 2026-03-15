import * as vscode from 'vscode'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import {
  replace_changes_symbol,
  replace_commit_symbol,
  replace_context_at_commit_symbol
} from './git/replace-git-symbols'
import { replace_saved_context_symbol } from './saved-context/replace-saved-context-symbol'
import { replace_selection_symbol } from './selection/replace-selection-symbol'
import { replace_skill_symbol } from './skill/replace-skill-symbol'
import { replace_image_symbol } from './image/replace-image-symbol'
import { replace_pasted_text_symbol } from './pasted-text/replace-pasted-text-symbol'
import { replace_website_symbol } from './website/replace-website-symbol'
import { replace_fragment_symbol } from './fragment/replace-fragment-symbol'

export interface ReplaceSymbolsParams {
  instruction: string
  context: vscode.ExtensionContext
  workspace_provider: WorkspaceProvider
  remove_images?: boolean
}

export const replace_symbols = async (
  params: ReplaceSymbolsParams
): Promise<{ instruction: string; skill_definitions: string }> => {
  let processed_instructions = params.instruction
  let skill_definitions = ''

  if (processed_instructions.includes('#Selection')) {
    processed_instructions = replace_selection_symbol(processed_instructions)
  }

  if (processed_instructions.includes('#Changes(')) {
    const result = await replace_changes_symbol({
      instruction: processed_instructions
    })
    processed_instructions = result.instruction
    skill_definitions += result.changes_definitions
  }

  if (processed_instructions.includes('#Commit(')) {
    const result = await replace_commit_symbol({
      instruction: processed_instructions
    })
    processed_instructions = result.instruction
    skill_definitions += result.commit_definitions
  }

  if (processed_instructions.includes('#ContextAtCommit(')) {
    processed_instructions = await replace_context_at_commit_symbol({
      instruction: processed_instructions,
      workspace_provider: params.workspace_provider
    })
  }

  if (processed_instructions.includes('#SavedContext(')) {
    const result = await replace_saved_context_symbol({
      instruction: processed_instructions,
      context: params.context,
      workspace_provider: params.workspace_provider
    })
    processed_instructions = result.instruction
    skill_definitions += result.context_definitions
  }

  if (processed_instructions.includes('#Skill(')) {
    const result = await replace_skill_symbol({
      instruction: processed_instructions
    })
    processed_instructions = result.instruction
    skill_definitions += result.skill_definitions
  }

  if (processed_instructions.includes('#Image(')) {
    processed_instructions = await replace_image_symbol({
      instruction: processed_instructions,
      remove: params.remove_images
    })
  }

  if (processed_instructions.includes('#PastedText(')) {
    processed_instructions = await replace_pasted_text_symbol({
      instruction: processed_instructions
    })
  }

  if (processed_instructions.includes('#Website(')) {
    processed_instructions = await replace_website_symbol({
      instruction: processed_instructions
    })
  }

  if (processed_instructions.includes('<fragment')) {
    processed_instructions = replace_fragment_symbol(processed_instructions)
  }

  return { instruction: processed_instructions, skill_definitions }
}
