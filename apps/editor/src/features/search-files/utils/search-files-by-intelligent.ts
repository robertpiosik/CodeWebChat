import * as vscode from 'vscode'
import axios from 'axios'
import { send_llm_message } from '@/utils/send-llm-message'
import {
  ai_file_search_task_instructions,
  ai_file_search_format_instructions
} from '@/constants/instructions'
import { apply_reasoning_effort } from '@/utils/apply-reasoning-effort'
import { build_user_content } from '@/utils/build-user-content'
import { extract_paths_from_bullet_list } from '@/utils/extract-paths-from-bullet-list'
import { Logger } from '@shared/utils/logger'
import { FileData } from './analyze-files'
import { ModelProvider } from '@/services/model-providers-manager'
import { t } from '@/i18n'

export const search_files_by_intelligent = async (
  files_data: FileData[],
  shrink_result: boolean,
  instructions: string,
  model_provider: ModelProvider,
  selected_config: any
): Promise<string[] | 'cancel' | 'error_no_files' | 'error'> => {
  let md_files = ''
  for (const file of files_data) {
    const content_to_use = shrink_result ? file.shrunk_content : file.content
    const backticks = content_to_use.includes('```') ? '````' : '```'
    md_files += `### File: \`${file.display_path}\`\n\n${backticks}\n${content_to_use}\n${backticks}\n\n`
  }

  const config = vscode.workspace.getConfiguration('codeWebChat')
  const base_instructions =
    config.get<string>('intelligentFileSearchInstructions') ||
    ai_file_search_task_instructions

  const part1 = `# Files\n\n${md_files}`
  const part2 = `# Task\n\n${base_instructions}\n\n# Output formatting\n\n${ai_file_search_format_instructions}\n\n# Query\n\n${instructions}`
  const user_content = build_user_content({
    model_provider,
    part1,
    part2
  })

  const messages = [{ role: 'user', content: user_content }]
  const body: { [key: string]: any } = {
    messages,
    model: selected_config.model
  }

  apply_reasoning_effort({
    body,
    model_provider,
    reasoning_effort: selected_config.reasoning_effort
  })

  const abort_controller = new AbortController()

  try {
    const completion_result = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: t('feature.search-files.progress.finding'),
        cancellable: true
      },
      async (progress, token) => {
        token.onCancellationRequested(() => {
          abort_controller.abort(t('feature.search-files.cancel.user'))
        })
        progress.report({ message: t('common.progress.waiting-for-server') })
        return await send_llm_message({
          base_url: model_provider.base_url,
          api_key: model_provider.api_key,
          body,
          abort_signal: abort_controller.signal,
          on_chunk: () =>
            progress.report({ message: t('common.progress.receiving') }),
          on_thinking_chunk: () =>
            progress.report({ message: t('common.progress.thinking') })
        })
      }
    )

    if (completion_result) {
      const extracted_files = extract_paths_from_bullet_list({
        text: completion_result.response,
        workspace_files: files_data.map((f) => f.display_path)
      })
      return extracted_files.length == 0 ? 'error_no_files' : extracted_files
    }
    return 'error'
  } catch (error) {
    if (!axios.isCancel(error)) {
      Logger.error({
        function_name: 'search_files_by_intelligent',
        message: 'Error finding intelligent file search results',
        data: error
      })
      vscode.window.showErrorMessage(t('feature.search-files.error.finding'))
      return 'error'
    }
    return 'cancel'
  }
}
