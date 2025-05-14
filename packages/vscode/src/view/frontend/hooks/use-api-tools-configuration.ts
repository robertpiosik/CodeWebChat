import { useEffect, useState } from 'react'
import { ExtensionMessage, WebviewMessage } from '../../types/messages'
import { ToolSettings } from '@shared/types/tool-settings'

export const use_api_tools_configuration = (vscode: any) => {
  const [code_completions_settings, set_code_completions_settings] =
    useState<ToolSettings>()
  const [file_refactoring_settings, set_file_refactoring_settings] =
    useState<ToolSettings>()
  const [commit_message_settings, set_commit_message_settings] =
    useState<ToolSettings>()

  useEffect(() => {
    const handle_message = (event: MessageEvent<ExtensionMessage>) => {
      const message = event.data
      if (message.command == 'API_TOOL_CODE_COMPLETIONS_SETTINGS') {
        set_code_completions_settings(message.settings)
      } else if (message.command == 'API_TOOL_FILE_REFACTORING_SETTINGS') {
        set_file_refactoring_settings(message.settings)
      } else if (message.command == 'API_TOOL_COMMIT_MESSAGES_SETTINGS') {
        set_commit_message_settings(message.settings)
      }
    }
    window.addEventListener('message', handle_message)

    const initial_messages = [
      {
        command: 'GET_API_TOOL_CODE_COMPLETIONS_SETTINGS'
      } as WebviewMessage,
      {
        command: 'GET_API_TOOL_FILE_REFACTORING_SETTINGS'
      } as WebviewMessage,
      {
        command: 'GET_API_TOOL_COMMIT_MESSAGES_SETTINGS'
      } as WebviewMessage
    ]
    initial_messages.forEach((message) => vscode.postMessage(message))

    return () => window.removeEventListener('message', handle_message)
  }, [])

  const handle_code_completions_settings_change = (settings: ToolSettings) => {
    set_code_completions_settings(settings)
    vscode.postMessage({
      command: 'UPDATE_TOOL_CODE_COMPLETIONS_SETTINGS',
      settings
    })
  }

  const handle_file_refactoring_settings_change = (settings: ToolSettings) => {
    set_file_refactoring_settings(settings)
    vscode.postMessage({
      command: 'UPDATE_TOOL_FILE_REFACTORING_SETTINGS',
      settings
    })
  }

  const handle_commit_message_settings_change = (settings: ToolSettings) => {
    set_commit_message_settings(settings)
    vscode.postMessage({
      command: 'UPDATE_TOOL_COMMIT_MESSAGES_SETTINGS',
      settings
    })
  }

  return {
    code_completions_settings,
    file_refactoring_settings,
    commit_message_settings,
    handle_code_completions_settings_change,
    handle_file_refactoring_settings_change,
    handle_commit_message_settings_change
  }
}
