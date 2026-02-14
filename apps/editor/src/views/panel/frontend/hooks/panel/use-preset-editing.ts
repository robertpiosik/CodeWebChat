import { useState, useEffect } from 'react'
import { Preset } from '@shared/types/preset'
import { BackendMessage } from '../../../types/messages'
import { post_message } from '../../utils/post_message'

export const use_preset_editing = (vscode: any) => {
  const [updating_preset, set_updating_preset] = useState<Preset>()
  const [updated_preset, set_updated_preset] = useState<Preset>()

  const edit_preset_back_click_handler = () => {
    post_message(vscode, {
      command: 'UPDATE_PRESET',
      updating_preset: updating_preset!,
      updated_preset: updated_preset!,
      origin: 'back_button'
    })
  }

  const edit_preset_save_handler = () => {
    post_message(vscode, {
      command: 'UPDATE_PRESET',
      updating_preset: updating_preset!,
      updated_preset: updated_preset!,
      origin: 'save_button'
    })
  }

  const handle_preview_preset = () => {
    post_message(vscode, {
      command: 'PREVIEW_PRESET',
      preset: updated_preset!
    })
  }

  useEffect(() => {
    const handle_message = (event: MessageEvent<BackendMessage>) => {
      const message = event.data
      if (message.command == 'PRESET_UPDATED') {
        set_updating_preset(undefined)
        set_updated_preset(undefined)
      }
    }

    window.addEventListener('message', handle_message)
    return () => window.removeEventListener('message', handle_message)
  }, [])

  return {
    updating_preset,
    set_updating_preset,
    updated_preset,
    set_updated_preset,
    edit_preset_back_click_handler,
    edit_preset_save_handler,
    handle_preview_preset
  }
}
