import { useState, useEffect } from 'react'
import { BackendMessage } from '../../../types/messages'
import { post_message } from '../../utils/post_message'
import { ApiConfiguration } from '@shared/types/response-history-item'
import { ItemInPreview } from '@shared/types/file-in-preview'

export const use_preview_manager = (vscode: any) => {
  const [items_in_preview, set_items_in_preview] = useState<ItemInPreview[]>()
  const [raw_instructions, set_raw_instructions] = useState<string>()
  const [preview_item_created_at, set_preview_item_created_at] =
    useState<number>()
  const [fix_all_automatically, set_fix_all_automatically] = useState(false)
  const [url, set_url] = useState<string>()
  const [api_configuration, set_api_configuration] =
    useState<ApiConfiguration>()

  const handle_discard_user_changes_in_preview = (file: {
    file_path: string
    workspace_name?: string
  }) => {
    post_message(vscode, {
      command: 'DISCARD_USER_CHANGES_IN_PREVIEW',
      file_path: file.file_path,
      workspace_name: file.workspace_name
    })
  }

  useEffect(() => {
    const handle_message = (event: MessageEvent<BackendMessage>) => {
      const message = event.data
      if (message.command == 'RESPONSE_PREVIEW_STARTED') {
        set_items_in_preview(message.items)
        set_raw_instructions(message.raw_instructions)
        set_preview_item_created_at(message.created_at)
        set_fix_all_automatically(message.fix_all_automatically ?? false)
        set_url(message.url)
        set_api_configuration(message.api_configuration)
      } else if (message.command == 'UPDATE_FILE_IN_PREVIEW') {
        set_items_in_preview((current_items) => {
          const items = current_items ?? []
          const existing_file_index = items.findIndex(
            (f) =>
              f.type == 'file' &&
              f.file_path == message.file.file_path &&
              f.workspace_name == message.file.workspace_name
          )

          if (existing_file_index != -1) {
            const new_items = [...items]
            const existing_item = items[existing_file_index]
            if (existing_item.type == 'file') {
              new_items[existing_file_index] = {
                ...message.file,
                is_checked: existing_item.is_checked,
                is_applying: existing_item.is_applying,
                apply_status: existing_item.apply_status,
                apply_progress: existing_item.apply_progress,
                apply_tokens_per_second: existing_item.apply_tokens_per_second
              }
            }
            return new_items
          } else {
            return [...items, { ...message.file, is_checked: true }]
          }
        })
      } else if (message.command == 'UPDATE_FILE_PROGRESS') {
        set_items_in_preview((current_items) => {
          if (!current_items) return undefined
          const items = current_items ?? []
          const existing_file_index = items.findIndex(
            (f) =>
              f.type == 'file' &&
              f.file_path == message.file_path &&
              f.workspace_name == message.workspace_name
          )

          if (existing_file_index != -1) {
            const new_items = [...items]
            const existing_item = items[existing_file_index]
            if (existing_item.type == 'file') {
              new_items[existing_file_index] = {
                ...existing_item,
                is_applying: message.is_applying,
                apply_status: message.apply_status,
                apply_progress: message.apply_progress,
                apply_tokens_per_second: message.apply_tokens_per_second,
                applied_with_intelligent_update:
                  message.apply_status == 'done'
                    ? true
                    : existing_item.applied_with_intelligent_update
              }
            }
            return new_items
          }
          return items
        })
      } else if (message.command == 'RESPONSE_PREVIEW_FINISHED') {
        set_items_in_preview(undefined)
        set_raw_instructions(undefined)
        set_preview_item_created_at(undefined)
        set_url(undefined)
        set_api_configuration(undefined)
      }
    }

    window.addEventListener('message', handle_message)
    return () => window.removeEventListener('message', handle_message)
  }, [])

  return {
    items_in_preview,
    set_items_in_preview,
    raw_instructions,
    url,
    preview_item_created_at,
    fix_all_automatically,
    handle_discard_user_changes_in_preview,
    api_configuration
  }
}
