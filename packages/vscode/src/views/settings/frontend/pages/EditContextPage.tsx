import { useEffect, useState } from 'react'
import {
  BackendMessage,
  ConfigurationForClient
} from '@/views/settings/types/messages'
import { post_message } from '../utils/post_message'
import { ConfigurationsList } from '@ui/components/editor/settings/ConfigurationsList'
import { Page } from '@ui/components/editor/settings/Page'

export const EditContextPage = ({ vscode }: { vscode: any }) => {
  const [configurations, set_configurations] = useState<
    ConfigurationForClient[]
  >([])

  useEffect(() => {
    const handle_message = (event: MessageEvent<BackendMessage>) => {
      const message = event.data
      if (message.command == 'EDIT_CONTEXT_CONFIGURATIONS') {
        set_configurations(message.configurations)
      }
    }
    window.addEventListener('message', handle_message)

    post_message(vscode, { command: 'GET_EDIT_CONTEXT_CONFIGURATIONS' })

    return () => {
      window.removeEventListener('message', handle_message)
    }
  }, [])

  return (
    <Page
      title="Edit Context"
      subtitle="Modify files based on natural language instructions."
    >
      <ConfigurationsList
        configurations={configurations}
        on_add={() => {
          post_message(vscode, {
            command: 'ADD_EDIT_CONTEXT_CONFIGURATION'
          })
        }}
        on_reorder={(reordered) => {
          set_configurations(reordered)
          post_message(vscode, {
            command: 'REORDER_EDIT_CONTEXT_CONFIGURATIONS',
            configurations: reordered
          })
        }}
        on_edit={(configuration_id) => {
          post_message(vscode, {
            command: 'EDIT_EDIT_CONTEXT_CONFIGURATION',
            configuration_id
          })
        }}
        on_delete={(configuration_id) => {
          post_message(vscode, {
            command: 'DELETE_EDIT_CONTEXT_CONFIGURATION',
            configuration_id
          })
        }}
      />
    </Page>
  )
}
