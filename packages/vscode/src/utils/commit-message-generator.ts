import * as vscode from 'vscode'
import axios from 'axios'
import * as path from 'path'
import * as fs from 'fs'
import { make_api_request } from './make-api-request'
import { Logger } from './logger'
import { should_ignore_file } from '../context/utils/should-ignore-file'
import { process_single_trailing_dot } from '@/utils/process-single-trailing-dot/process-single-trailing-dot'
import {
  ApiProvidersManager,
  ReasoningEffort
} from '../services/api-providers-manager'
import { ignored_extensions } from '@/context/constants/ignored-extensions'
import { PROVIDERS } from '@shared/constants/providers'
import { COMMIT_MESSAGES_CONFIRMATION_THRESHOLD_STATE_KEY } from '../constants/state-keys'
import { GitRepository } from './git-repository-utils'

export interface FileData {
  path: string
  relative_path: string
  content: string
  estimated_tokens: number
  status: number
  is_large_file: boolean
}

export interface CommitMessageConfig {
  provider_name: string
  model: string
  temperature: number
  reasoning_effort?: ReasoningEffort
}

export async function get_commit_message_config(
  context: vscode.ExtensionContext
): Promise<{
  config: CommitMessageConfig
  provider: any
  endpoint_url: string
} | null> {
  const api_providers_manager = new ApiProvidersManager(context)
  const commit_message_config =
    await api_providers_manager.get_commit_messages_tool_config()

  if (!commit_message_config) {
    vscode.window.showErrorMessage(
      'Commit Messages API tool is not configured. Navigate to the Settings tab, configure API providers and setup the API tool.'
    )
    Logger.warn({
      function_name: 'get_commit_message_config',
      message: 'Commit Messages API tool is not configured.'
    })
    return null
  }

  const provider = await api_providers_manager.get_provider(
    commit_message_config.provider_name
  )

  if (!provider) {
    vscode.window.showErrorMessage(
      'API provider not found for Commit Messages tool. Navigate to the Settings tab, configure API providers and setup the API tool.'
    )
    Logger.warn({
      function_name: 'get_commit_message_config',
      message: 'API provider not found for Commit Messages tool.'
    })
    return null
  }

  if (!provider.api_key) {
    vscode.window.showErrorMessage(
      'API key is missing for the selected provider. Please add it in the Settings tab.'
    )
    return null
  }

  let endpoint_url = ''
  if (provider.type === 'built-in') {
    const provider_info = PROVIDERS[provider.name]
    endpoint_url = provider_info.base_url
  } else {
    endpoint_url = provider.base_url
  }

  return {
    config: commit_message_config,
    provider,
    endpoint_url
  }
}

export function get_ignored_extensions(): Set<string> {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const config_ignored_extensions = new Set(
    config
      .get<string[]>('ignoredExtensions', [])
      .map((ext) => ext.toLowerCase().replace(/^\./, ''))
  )
  return new Set([...ignored_extensions, ...config_ignored_extensions])
}

export async function collect_affected_files_with_metadata(
  repository: GitRepository,
  ignored_extensions: Set<string>
): Promise<FileData[]> {
  const staged_files = repository.state.indexChanges || []
  const files_data: FileData[] = []

  for (const change of staged_files) {
    const file_path = change.uri.fsPath
    const relative_path = path.relative(repository.rootUri.fsPath, file_path)

    if (should_ignore_file(relative_path, ignored_extensions)) {
      continue
    }

    let content = ''
    let is_large_file = false
    try {
      const stats = await fs.promises.stat(file_path)
      if (stats.size > 1024 * 1024) {
        // 1MB limit for direct content inclusion
        is_large_file = true
        content = `File content omitted due to large size (${(
          stats.size /
          (1024 * 1024)
        ).toFixed(2)} MB).`
      } else {
        content = await fs.promises.readFile(file_path, 'utf8')
      }
    } catch (read_error) {
      Logger.warn({
        function_name: 'collect_affected_files_with_metadata',
        message: `Could not read file content for ${relative_path}`,
        data: read_error
      })
      content = `Could not read file content.`
    }

    // Simple token estimation: 1 token per 4 characters
    const estimated_tokens = Math.ceil(content.length / 4)

    files_data.push({
      path: file_path,
      relative_path: relative_path,
      content: content,
      estimated_tokens: estimated_tokens,
      status: change.status,
      is_large_file: is_large_file
    })
  }
  return files_data
}

export async function handle_file_selection_if_needed(
  context: vscode.ExtensionContext,
  files_data: FileData[]
): Promise<FileData[] | null> {
  const threshold = context.globalState.get<number>(
    COMMIT_MESSAGES_CONFIRMATION_THRESHOLD_STATE_KEY,
    20000
  )

  const total_tokens = files_data.reduce(
    (sum, file) => sum + file.estimated_tokens,
    0
  )

  if (total_tokens <= threshold) {
    return files_data
  }

  const selected_files = await show_file_selection_dialog(
    files_data,
    threshold,
    total_tokens
  )
  if (!selected_files || selected_files.length == 0) {
    vscode.window.showInformationMessage(
      'No files selected for commit message generation.'
    )
    return null
  }

  return selected_files
}

async function show_file_selection_dialog(
  files_data: FileData[],
  threshold: number,
  total_tokens: number
): Promise<FileData[] | undefined> {
  const items = files_data.map((file) => {
    const token_count = file.estimated_tokens
    const formatted_token_count =
      token_count >= 1000
        ? `${Math.floor(token_count / 1000)}k`
        : `${token_count}`

    const relative_path = path.dirname(file.relative_path)

    return {
      label: path.basename(file.relative_path),
      description: `${formatted_token_count} ${
        relative_path != '.' ? relative_path : ''
      }`,
      detail: file.is_large_file ? 'Content omitted (large file)' : '',
      file_data: file,
      picked: true
    }
  })

  const exceeded_by = total_tokens - threshold
  const format_tokens = (tokens: number): string => {
    if (tokens < 1000) {
      return tokens.toString()
    }
    return `${Math.round(tokens / 1000)}k`
  }
  const formatted_total_tokens = format_tokens(total_tokens)
  const formatted_exceeded_by = format_tokens(exceeded_by)

  vscode.window.showInformationMessage(
    `Total tokens in affected files: ${formatted_total_tokens}, exceeds threshold by ${formatted_exceeded_by}.`
  )

  const result = await vscode.window.showQuickPick(items, {
    canPickMany: true,
    placeHolder: 'Review affected files to include'
  })

  if (!result) {
    return undefined
  }

  return result.map((item) => item.file_data)
}

export function build_files_content(files_data: FileData[]): string {
  if (!files_data || files_data.length == 0) {
    return 'No relevant files to include.'
  }

  return files_data
    .map((file) => {
      return `File: ${file.relative_path}\nContent:\n${file.content}`
    })
    .join('\n---\n')
}

export function strip_wrapping_quotes(text: string): string {
  // Remove leading/trailing whitespace
  text = text.trim()

  // Check for single quotes
  if (
    (text.startsWith("'") && text.endsWith("'")) ||
    (text.startsWith('"') && text.endsWith('"')) ||
    (text.startsWith('`') && text.endsWith('`'))
  ) {
    return text.substring(1, text.length - 1).trim()
  }
  return text
}

export async function generate_commit_message_with_api(
  endpoint_url: string,
  provider: any,
  config: CommitMessageConfig,
  message: string,
  progress_title: string
): Promise<string | null> {
  const token_count = Math.ceil(message.length / 4)
  const formatted_token_count =
    token_count > 1000 ? Math.ceil(token_count / 1000) + 'k' : token_count

  Logger.log({
    function_name: 'generate_commit_message_with_api',
    message: 'Getting commit message...',
    data: message
  })

  return await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `${progress_title} Sent about ${formatted_token_count} tokens.`,
      cancellable: true
    },
    async (_, token) => {
      const messages = [
        {
          role: 'user',
          content: message
        }
      ]

      const body = {
        messages,
        model: config.model,
        temperature: config.temperature
      } as any

      if (config.reasoning_effort) {
        body.reasoning_effort = config.reasoning_effort
      }

      const cancel_token_source = axios.CancelToken.source()

      token.onCancellationRequested(() => {
        cancel_token_source.cancel('Operation cancelled by user')
      })

      try {
        const response = await make_api_request(
          endpoint_url,
          provider.api_key,
          body,
          cancel_token_source.token
        )

        if (!response) {
          vscode.window.showErrorMessage('Failed to generate commit message.')
          return null
        } else {
          let commit_message = process_single_trailing_dot(response)
          commit_message = strip_wrapping_quotes(commit_message)
          return commit_message
        }
      } catch (error) {
        if (axios.isCancel(error)) {
          vscode.window.showInformationMessage(
            'Commit message generation cancelled.'
          )
          return null
        }
        Logger.error({
          function_name: 'generate_commit_message_with_api',
          message: 'Error during API request',
          data: error
        })
        throw error
      }
    }
  )
}

export function build_commit_message_prompt(
  commit_message_prompt: string,
  affected_files: string,
  diff: string
): string {
  return `${commit_message_prompt}\n${affected_files}\n${diff}\n${commit_message_prompt}`
}
