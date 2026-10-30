import * as vscode from 'vscode'
import { WorkspaceProvider } from '@/context/providers/workspace/workspace-provider'
import {
  replace_changes_symbol,
  replace_commit_symbol
} from './git/replace-git-symbols'
import { replace_saved_context_symbol } from './saved-context/replace-saved-context-symbol'
import { replace_skill_symbol } from './skill/replace-skill-symbol'
import { replace_image_symbol } from './image/replace-image-symbol'
import { replace_pasted_text_symbol } from './pasted-text/replace-pasted-text-symbol'
import { replace_website_symbol } from './website/replace-website-symbol'
import { replace_fragment_symbol } from './fragment/replace-fragment-symbol'
import { replace_snippet_symbol } from './snippet/replace-snippet-symbol'
import { SymbolCacheManager } from './symbol-cache'

export const replace_symbols = async (params: {
  instructions: string[]
  extension_context: vscode.ExtensionContext
  workspace_provider: WorkspaceProvider
  remove_images?: boolean
  image_as_paths?: boolean
  symbols_cache?: SymbolCacheManager
}): Promise<{
  instructions: string[]
  skill_definitions: string
  accuracy_boost: boolean
}> => {
  let processed_instructions = [...params.instructions]
  let skill_definitions = ''

  let snippet_iterations = 0
  let has_snippets = processed_instructions.some((i) => i.includes('#Snippet('))
  while (has_snippets && snippet_iterations < 10) {
    const result = await replace_snippet_symbol({
      instructions: processed_instructions
    })

    const changed = result.instructions.some(
      (instr, idx) => instr !== processed_instructions[idx]
    )
    if (!changed) {
      break
    }

    processed_instructions = result.instructions
    has_snippets = processed_instructions.some((i) => i.includes('#Snippet('))
    snippet_iterations++
  }

  if (processed_instructions.some((i) => i.includes('#Changes('))) {
    const result = await replace_changes_symbol({
      instructions: processed_instructions,
      symbols_cache: params.symbols_cache
    })
    processed_instructions = result.instructions
    skill_definitions += result.changes_definitions
  }

  if (
    processed_instructions.some(
      (i) => i.includes('#Commit(') || i.includes('#CommitMessage(')
    )
  ) {
    const result = await replace_commit_symbol({
      instructions: processed_instructions,
      symbols_cache: params.symbols_cache
    })
    processed_instructions = result.instructions
    skill_definitions += result.commit_definitions
  }

  if (processed_instructions.some((i) => i.includes('#SavedContext('))) {
    const result = await replace_saved_context_symbol({
      instructions: processed_instructions,
      extension_context: params.extension_context,
      workspace_provider: params.workspace_provider,
      symbols_cache: params.symbols_cache
    })
    processed_instructions = result.instructions
    skill_definitions += result.context_definitions
  }

  if (processed_instructions.some((i) => i.includes('#Skill('))) {
    const result = await replace_skill_symbol({
      instructions: processed_instructions,
      symbols_cache: params.symbols_cache
    })
    processed_instructions = result.instructions
    skill_definitions += result.skill_definitions
  }

  if (processed_instructions.some((i) => i.includes('#Image('))) {
    processed_instructions = await replace_image_symbol({
      instructions: processed_instructions,
      remove: params.remove_images,
      as_paths: params.image_as_paths
    })
  }

  if (processed_instructions.some((i) => i.includes('#PastedText('))) {
    processed_instructions = await replace_pasted_text_symbol({
      instructions: processed_instructions,
      extension_context: params.extension_context
    })
  }

  if (processed_instructions.some((i) => i.includes('#Website('))) {
    processed_instructions = await replace_website_symbol({
      instructions: processed_instructions,
      extension_context: params.extension_context,
      symbols_cache: params.symbols_cache
    })
  }

  if (processed_instructions.some((i) => i.includes('#Fragment('))) {
    processed_instructions = await replace_fragment_symbol({
      instructions: processed_instructions,
      workspace_provider: params.workspace_provider
    })
  }

  const accuracy_boost = processed_instructions.some((i) =>
    i.includes('#AccuracyBoost')
  )
  if (accuracy_boost) {
    processed_instructions = processed_instructions.map((i) =>
      i
        .replace(/ #AccuracyBoost /g, ' ')
        .replace(/ ?#AccuracyBoost ?/g, '')
        .trim()
    )
  }

  return {
    instructions: processed_instructions,
    skill_definitions,
    accuracy_boost
  }
}
