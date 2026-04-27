import * as vscode from 'vscode'
import axios from 'axios'
import { make_api_request } from '../../../utils/make-api-request'
import {
  find_relevant_files_instructions,
  find_relevant_files_format
} from '../../../constants/instructions'
import { apply_reasoning_effort } from '../../../utils/apply-reasoning-effort'
import { build_user_content } from '../../../utils/build-user-content'
import { Logger } from '@shared/utils/logger'
import { FileData } from './analyze-workspace-files'
import { Provider } from '../../../services/model-providers-manager'
import { t } from '@/i18n'

export const fetch_relevant_files_from_api = async (
  files_data: FileData[],
  shrink_result: boolean,
  instructions: string,
  provider: Provider,
  selected_config: any
): Promise<string[] | 'cancel' | 'error_no_files' | 'error'> => {
  let xml_files = `<files>\n`
  for (const file of files_data) {
    const content_to_use = shrink_result ? file.shrunk_content : file.content
    xml_files += `<file path="${file.relative_path}">\n<![CDATA[\n${content_to_use}\n]]>\n</file>\n`
  }
  xml_files += `</files>`

  const system_instructions_xml = `${find_relevant_files_format}\n${find_relevant_files_instructions}`
  const part2 = `${system_instructions_xml}\n${instructions}`
  const user_content = build_user_content({
    provider_name: provider.name,
    part1: xml_files,
    part2,
    disable_cache: true
  })

  const messages = [{ role: 'user', content: user_content }]
  const body: { [key: string]: any } = {
    messages,
    model: selected_config.model,
    temperature: selected_config.temperature
  }

  apply_reasoning_effort({
    body,
    provider,
    reasoning_effort: selected_config.reasoning_effort
  })

  const cancel_token_source = axios.CancelToken.source()

  try {
    const completion_result = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: t('command.find-relevant-files.progress.finding'),
        cancellable: true
      },
      async (progress, token) => {
        token.onCancellationRequested(() => {
          cancel_token_source.cancel(
            t('command.find-relevant-files.cancel.user')
          )
        })
        progress.report({ message: t('common.progress.waiting-for-server') })
        return await make_api_request({
          endpoint_url: provider.base_url,
          api_key: provider.api_key,
          body,
          cancellation_token: cancel_token_source.token,
          on_chunk: () =>
            progress.report({ message: t('common.progress.receiving') }),
          on_thinking_chunk: () =>
            progress.report({ message: t('common.progress.thinking') })
        })
      }
    )

    if (completion_result) {
      const match = completion_result.response.match(
        /<relevant-files>([\s\S]*?)<\/relevant-files>/
      )
      const extracted_files: string[] = []
      if (match && match[1]) {
        const file_matches = match[1].matchAll(/<file-path>(.*?)<\/file-path>/g)
        for (const m of file_matches) extracted_files.push(m[1].trim())
      }
      return extracted_files.length == 0 ? 'error_no_files' : extracted_files
    }
    return 'cancel'
  } catch (error) {
    if (!axios.isCancel(error)) {
      Logger.error({
        function_name: 'fetch_relevant_files_from_api',
        message: 'Error finding relevant files',
        data: error
      })
      vscode.window.showErrorMessage(
        t('command.find-relevant-files.error.finding')
      )
    }
    return 'error'
  }
}
