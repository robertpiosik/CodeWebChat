import { useState, useEffect } from 'react'
import {
  BackendMessage,
  FrontendMessage,
  SelectionState
} from '../../../types/messages'
import { post_message } from '../../utils/post_message'

export const use_editor_sync = (vscode: any) => {
  const [currently_open_file_path, set_currently_open_file_path] = useState<
    string | undefined
  >()
  const [current_selection, set_current_selection] =
    useState<SelectionState | null>(null)
  const [currently_open_file_text, set_currently_open_file_text] = useState<
    string | undefined
  >(undefined)
  const [context_file_paths, set_context_file_paths] = useState<string[]>([])
  const [workspace_folder_count, set_workspace_folder_count] =
    useState<number>()

  useEffect(() => {
    const handle_message = (event: MessageEvent<BackendMessage>) => {
      const message = event.data
      if (message.command == 'EDITOR_STATE_CHANGED') {
        set_currently_open_file_path(message.currently_open_file_path)
      } else if (message.command == 'EDITOR_SELECTION_CHANGED') {
        set_current_selection(message.current_selection)
      } else if (message.command == 'CONTEXT_FILES') {
        set_context_file_paths(message.file_paths)
      } else if (message.command == 'CURRENTLY_OPEN_FILE_TEXT') {
        set_currently_open_file_text(message.text)
      } else if (message.command == 'WORKSPACE_STATE') {
        set_workspace_folder_count(message.folder_count)
      }
    }

    window.addEventListener('message', handle_message)

    const initial_messages: FrontendMessage[] = [
      { command: 'REQUEST_EDITOR_STATE' },
      { command: 'REQUEST_EDITOR_SELECTION_STATE' },
      { command: 'GET_WORKSPACE_STATE' },
      { command: 'REQUEST_CURRENTLY_OPEN_FILE_TEXT' }
    ]
    initial_messages.forEach((message) => post_message(vscode, message))

    return () => window.removeEventListener('message', handle_message)
  }, [])

  return {
    currently_open_file_path,
    current_selection,
    currently_open_file_text,
    context_file_paths,
    workspace_folder_count
  }
}
