import { useEffect, useState } from 'react'
import {
  BackendMessage,
  ConfigurationForClient
} from '@/views/settings/types/messages'
import { post_message } from '../utils/post_message'
import { ConfigurationsList } from '@ui/components/editor/settings/ConfigurationsList'
import { Page } from '@ui/components/editor/settings/Page'

export const IntelligentUpdatePage = ({ vscode }: { vscode: any }) => {
  const [configurations, set_configurations] = useState<
    ConfigurationForClient[]
  >([])

  useEffect(() => {
    const handle_message = (event: MessageEvent<BackendMessage>) => {
      const message = event.data
      if (message.command == 'INTELLIGENT_UPDATE_CONFIGURATIONS') {
        set_configurations(message.configurations)
      }
    }
    window.addEventListener('message', handle_message)

    post_message(vscode, { command: 'GET_INTELLIGENT_UPDATE_CONFIGURATIONS' })

    return () => {
      window.removeEventListener('message', handle_message)
    }
  }, [])

  return (
    <Page
      title="Intelligent Update"
      subtitle="Integrate truncated code blocks and fix malformed diffs."
    >
      <ConfigurationsList
        configurations={configurations}
        on_add={() => {
          post_message(vscode, {
            command: 'ADD_INTELLIGENT_UPDATE_CONFIGURATION'
          })
        }}
        on_reorder={(reordered) => {
          set_configurations(reordered)
          post_message(vscode, {
            command: 'REORDER_INTELLIGENT_UPDATE_CONFIGURATIONS',
            configurations: reordered
          })
        }}
        on_edit={(configuration_id) => {
          post_message(vscode, {
            command: 'EDIT_INTELLIGENT_UPDATE_CONFIGURATION',
            configuration_id
          })
        }}
        on_delete={(configuration_id) => {
          post_message(vscode, {
            command: 'DELETE_INTELLIGENT_UPDATE_CONFIGURATION',
            configuration_id
          })
        }}
        on_set_default={(configuration_id) => {
          post_message(vscode, {
            command: 'SET_DEFAULT_INTELLIGENT_UPDATE_CONFIGURATION',
            configuration_id
          })
        }}
        on_unset_default={() => {
          post_message(vscode, {
            command: 'SET_DEFAULT_INTELLIGENT_UPDATE_CONFIGURATION',
            configuration_id: null
          })
        }}
      />
    </Page>
  )
}
