import * as vscode from 'vscode'
import axios from 'axios'
import * as path from 'path'
import { ModelManager } from '../services/model-manager'
import { make_api_request } from '../helpers/make-api-request'
import { BUILT_IN_PROVIDERS } from '../constants/built-in-providers'
import { handle_rate_limit_fallback } from '../helpers/handle-rate-limit-fallback'
import { Provider } from '@/types/provider'
import { execSync } from 'child_process'
import { log } from '@/helpers/logger'

export function generate_commit_message_command(
  context: vscode.ExtensionContext
) {
  return vscode.commands.registerCommand(
    'geminiCoder.generateCommitMessage',
    async (source_control: vscode.SourceControl) => {
      const git_extension = vscode.extensions.getExtension('vscode.git')
      if (!git_extension) {
        vscode.window.showErrorMessage('Git extension not found.')
        return
      }

      const git_api = git_extension.exports.getAPI(1)

      const repositories = git_api.repositories
      if (!repositories || repositories.length == 0) {
        vscode.window.showErrorMessage('No Git repository found.')
        return
      }

      const repository = repositories.find(
        (repo: any) =>
          repo.rootUri.toString() == source_control.rootUri?.toString()
      )

      if (!repository) {
        vscode.window.showErrorMessage('Repository not found.')
        return
      }

      try {
        // Check for staged changes first
        const staged_changes = repository.state.indexChanges || []

        // If no staged changes, get diff of all changes
        // Otherwise, we'll only use the staged changes
        const use_staged = staged_changes.length > 0

        let diff: string
        if (use_staged) {
          // Get diff of only staged changes
          diff = execSync('git diff --staged', {
            cwd: repository.rootUri.fsPath
          }).toString()
        } else {
          // Get diff of all changes
          diff = await repository.diff()
        }

        if (!diff || diff.length == 0) {
          vscode.window.showInformationMessage('No changes to commit.')
          return
        }

        // Get configuration
        const config = vscode.workspace.getConfiguration()
        const user_providers =
          config.get<Provider[]>('geminiCoder.providers') || []
        const gemini_api_key = config.get<string>('geminiCoder.apiKey')
        const gemini_temperature = config.get<number>('geminiCoder.temperature')
        const commit_message_prompt = config.get<string>(
          'geminiCoder.commitMessagePrompt'
        )

        // Get default commit message model
        const model_manager = new ModelManager(context)
        const default_model_name =
          model_manager.get_default_commit_message_model()

        // Set up providers
        const all_providers = [
          ...BUILT_IN_PROVIDERS.map((provider) => ({
            ...provider,
            bearerToken: gemini_api_key || '',
            temperature: gemini_temperature
          })),
          ...user_providers
        ]

        const provider = all_providers.find((p) => p.name == default_model_name)
        if (!provider) {
          vscode.window.showErrorMessage(
            `Default commit message model not found: ${default_model_name}`
          )
          return
        }

        if (!provider.bearerToken) {
          vscode.window.showErrorMessage(
            'API key is missing. Please add it in the settings.'
          )
          return
        }

        // Collect the changed files with their original, unmodified content
        const affected_files = await collect_affected_files(
          repository,
          use_staged
        )

        const message = `${affected_files}\n${commit_message_prompt}\n${diff}`

        log({
          function_name: 'generate_commit_message_command',
          message: 'Getting commit message...',
          data: message
        })

        const token_count = Math.ceil(message.length / 4)
        const formatted_token_count =
          token_count > 1000 ? Math.ceil(token_count / 1000) + 'K' : token_count

        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `Generating commit message... (Sent about ${formatted_token_count} tokens)`,
            cancellable: false
          },
          async () => {
            // Prepare request to AI model
            const model = provider.model
            const temperature = provider.temperature
            const system_instructions = provider.systemInstructions

            const messages = [
              ...(system_instructions
                ? [{ role: 'system', content: system_instructions }]
                : []),
              {
                role: 'user',
                content: message
              }
            ]

            const body = {
              messages,
              model,
              temperature
            }

            // Make API request
            const cancel_token_source = axios.CancelToken.source()
            const response = await make_api_request(
              provider,
              body,
              cancel_token_source.token
            )

            if (!response) {
              vscode.window.showErrorMessage(
                'Failed to generate commit message. Please try again later.'
              )
              return
            } else if (response == 'rate_limit') {
              const fallback_response = await handle_rate_limit_fallback(
                all_providers,
                default_model_name,
                body,
                cancel_token_source.token
              )

              if (!fallback_response) {
                return
              }

              repository.inputBox.value = fallback_response
              return
            }

            repository.inputBox.value = response
          }
        )
      } catch (error) {
        console.error('Error generating commit message:', error)
        vscode.window.showErrorMessage(
          'Error generating commit message. See console for details.'
        )
      }
    }
  )
}

async function collect_affected_files(
  repository: any,
  use_staged: boolean = false
): Promise<string> {
  try {
    // Get the repository workspace root
    const root_path = repository.rootUri.fsPath

    // Get changed files - using the correct API method
    // Access changes through the state object, which is the proper VS Code Git API way
    const changes = repository.state.workingTreeChanges || []
    if (!changes || changes.length == 0) {
      return ''
    }

    let files_content = '<files>\n'

    for (const change of changes) {
      const file_path = change.uri.fsPath
      const relative_path = path.relative(root_path, file_path)

      try {
        let content = ''
        if (use_staged) {
          // For staged files, get content from the index
          try {
            content = execSync(`git show :"${relative_path}"`, {
              cwd: root_path
            }).toString()
          } catch {
            // File might be newly created and not in index yet
          }
        } else {
          // For unstaged changes, get content from HEAD
          if (change.status == 5 || change.status == 6) {
            // 5 - modified, 6 - deleted
            try {
              content = execSync(`git show HEAD:"${relative_path}"`, {
                cwd: root_path
              }).toString()
            } catch {
              // File might be newly added to git and not in HEAD yet
            }
          }
        }

        files_content += `<file name="${relative_path}">\n<![CDATA[\n${content}\n]]>\n</file>\n`
      } catch (err) {
        console.error(`Error processing file ${file_path}:`, err)
      }
    }

    files_content += '</files>'
    return files_content
  } catch (error) {
    console.error('Error collecting changed files:', error)
    return ''
  }
}
