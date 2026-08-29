import { PromptViewProvider } from '@/views/prompt/backend/prompt-view-provider'
import { FilesCollector } from '@/utils/files-collector'
import { replace_symbols } from '@/views/prompt/backend/utils/symbols/replace-symbols'

export const build_prompt_payload = async (params: {
  prompt_view_provider: PromptViewProvider
  remove_images?: boolean
}): Promise<{
  other_files: string
  recent_files: string
  collected_files: string
  processed_instructions: string
  skill_definitions: string
}> => {
  const { prompt_view_provider, remove_images } = params
  let other_files = ''
  let recent_files = ''
  let collected_files = ''

  const collected = await FilesCollector.collect_files({
    workspace_provider: prompt_view_provider.workspace_provider,
    open_editors_provider: prompt_view_provider.open_editors_provider
  })
  other_files = collected.other_files
  recent_files = collected.recent_files
  collected_files = other_files + recent_files

  const { instructions: processed_instructions, skill_definitions } =
    await replace_symbols({
      instructions: prompt_view_provider.current_instructions || '',
      extension_context: prompt_view_provider.extension_context,
      workspace_provider: prompt_view_provider.workspace_provider,
      remove_images
    })

  return {
    other_files,
    recent_files,
    collected_files,
    processed_instructions,
    skill_definitions
  }
}
