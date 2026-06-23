import { useState, useEffect } from 'react'
import { WebConfiguration } from '@shared/types/web-configuration'
import { BackendMessage } from '../../../types/messages'
import { post_message } from '../../utils/post-message'

export const use_web_configuration_editing = (vscode: any) => {
  const [updating_web_configuration, set_updating_web_configuration] = useState<WebConfiguration>()
  const [updated_web_configuration, set_updated_web_configuration] = useState<WebConfiguration>()

  const edit_web_configuration_back_click_handler = () => {
    post_message(vscode, {
      command: 'UPDATE_WEB_CONFIGURATION',
      updating_web_configuration: updating_web_configuration!,
      updated_web_configuration: updated_web_configuration!,
      origin: 'cancel'
    })
  }

  const edit_web_configuration_save_handler = () => {
    post_message(vscode, {
      command: 'UPDATE_WEB_CONFIGURATION',
      updating_web_configuration: updating_web_configuration!,
      updated_web_configuration: updated_web_configuration!,
      origin: 'save'
    })
  }

  const handle_preview_web_configuration = () => {
    post_message(vscode, {
      command: 'PREVIEW_WEB_CONFIGURATION',
      web_configuration: updated_web_configuration!
    })
  }

  useEffect(() => {
    const handle_message = (event: MessageEvent<BackendMessage>) => {
      const message = event.data
      if (message.command == 'WEB_CONFIGURATION_UPDATED') {
        set_updating_web_configuration(undefined)
        set_updated_web_configuration(undefined)
      }
    }

    window.addEventListener('message', handle_message)
    return () => window.removeEventListener('message', handle_message)
  }, [])

  return {
    updating_web_configuration,
    set_updating_web_configuration,
    set_updated_web_configuration,
    edit_web_configuration_back_click_handler,
    edit_web_configuration_save_handler,
    handle_preview_web_configuration
  }
}
