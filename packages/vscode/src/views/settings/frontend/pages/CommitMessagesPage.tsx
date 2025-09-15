import { useEffect, useState } from 'react'
import {
  BackendMessage,
  ConfigurationForClient
} from '@/views/settings/types/messages'
import { post_message } from '../utils/post_message'
import { ConfigurationsList } from '@ui/components/editor/settings/ConfigurationsList'
import { Page } from '@ui/components/editor/settings/Page'

export const CommitMessagesPage = ({ vscode }: { vscode: any }) => {
  const [configurations, set_configurations] = useState<
    ConfigurationForClient[]
  >([])

  useEffect(() => {
    const handle_message = (event: MessageEvent<BackendMessage>) => {
      const message = event.data
      if (message.command == 'COMMIT_MESSAGES_CONFIGURATIONS') {
        set_configurations(message.configurations)
      }
    }
    window.addEventListener('message', handle_message)

    post_message(vscode, { command: 'GET_COMMIT_MESSAGES_CONFIGURATIONS' })

    return () => {
      window.removeEventListener('message', handle_message)
    }
  }, [])

  return (
    <Page
      title="Commit Messages"
      subtitle="Generate meaningful summaries of changes adhering to your preferred style."
    >
      <ConfigurationsList
        configurations={configurations}
        on_add={() => {
          post_message(vscode, {
            command: 'ADD_COMMIT_MESSAGES_CONFIGURATION'
          })
        }}
        on_reorder={(reordered) => {
          set_configurations(reordered)
          post_message(vscode, {
            command: 'REORDER_COMMIT_MESSAGES_CONFIGURATIONS',
            configurations: reordered
          })
        }}
        on_edit={(configuration_id) => {
          post_message(vscode, {
            command: 'EDIT_COMMIT_MESSAGES_CONFIGURATION',
            configuration_id
          })
        }}
        on_delete={(configuration_id) => {
          post_message(vscode, {
            command: 'DELETE_COMMIT_MESSAGES_CONFIGURATION',
            configuration_id
          })
        }}
        on_set_default={(configuration_id) => {
          post_message(vscode, {
            command: 'SET_DEFAULT_COMMIT_MESSAGES_CONFIGURATION',
            configuration_id
          })
        }}
      />
    </Page>
  )
}
