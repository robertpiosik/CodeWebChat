import { useEffect, useState } from 'react'
import {
  BackendMessage,
  ConfigurationForClient
} from '@/views/settings/types/messages'
import { post_message } from '../utils/post_message'
import { ConfigurationsList } from '@ui/components/editor/settings/ConfigurationsList'
import { Page } from '@ui/components/editor/settings/Page'

export const CodeCompletionsPage = ({ vscode }: { vscode: any }) => {
  const [configurations, set_configurations] = useState<
    ConfigurationForClient[]
  >([])

  useEffect(() => {
    const handle_message = (event: MessageEvent<BackendMessage>) => {
      const message = event.data
      if (message.command == 'CODE_COMPLETIONS_CONFIGURATIONS') {
        set_configurations(message.configurations)
      }
    }
    window.addEventListener('message', handle_message)

    post_message(vscode, { command: 'GET_CODE_COMPLETIONS_CONFIGURATIONS' })

    return () => {
      window.removeEventListener('message', handle_message)
    }
  }, [])

  return (
    <Page
      title="Code Completions"
      subtitle="Get accurate code-at-cursor from state-of-the-art reasoning models."
    >
      <ConfigurationsList
        configurations={configurations}
        on_add={() => {
          post_message(vscode, {
            command: 'ADD_CODE_COMPLETIONS_CONFIGURATION'
          })
        }}
        on_reorder={(reordered) => {
          set_configurations(reordered)
          post_message(vscode, {
            command: 'REORDER_CODE_COMPLETIONS_CONFIGURATIONS',
            configurations: reordered
          })
        }}
        on_edit={(configuration_id) => {
          post_message(vscode, {
            command: 'EDIT_CODE_COMPLETIONS_CONFIGURATION',
            configuration_id
          })
        }}
        on_delete={(configuration_id) => {
          post_message(vscode, {
            command: 'DELETE_CODE_COMPLETIONS_CONFIGURATION',
            configuration_id
          })
        }}
        on_set_default={(configuration_id) => {
          post_message(vscode, {
            command: 'SET_DEFAULT_CODE_COMPLETIONS_CONFIGURATION',
            configuration_id
          })
        }}
        on_unset_default={() => {
          post_message(vscode, {
            command: 'SET_DEFAULT_CODE_COMPLETIONS_CONFIGURATION',
            configuration_id: null
          })
        }}
      />
    </Page>
  )
}
