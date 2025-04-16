import ReactDOM from 'react-dom/client'
import { WebChatsTab } from './tabs/web-chats/WebChatsTab'
import { ApiToolsTab } from './tabs/api-tools/ApiToolsTab'
import { Header } from '@ui/components/editor/Header'
import { useEffect, useState } from 'react'
import { Template } from '@ui/components/editor/Template'
import { EditView } from '@ui/components/editor/EditView'
import { EditPresetForm } from '@ui/components/editor/EditPresetForm'
import { Preset } from '@shared/types/preset'
import { ExtensionMessage } from './types/messages'

import '@vscode/codicons/dist/codicon.css'
import '@ui/styles/global.scss'

const vscode = acquireVsCodeApi()

const App = () => {
  const [active_tab, set_active_tab] = useState<'chat' | 'api'>('chat')
  const [updating_preset, set_updating_preset] = useState<Preset>()
  const [updated_preset, set_updated_preset] = useState<Preset>()

  const handle_preset_update = (updated_preset: Preset) => {
    set_updated_preset(updated_preset)
  }

  const handle_back_click = () => {
    vscode.postMessage({
      command: 'UPDATE_PRESET',
      original_name: updating_preset!.name,
      updated_preset: updated_preset
    })
  }

  // Finalize back click when presets gets updated
  useEffect(() => {
    const handle_message = (event: MessageEvent<ExtensionMessage>) => {
      const message = event.data
      if (message.command == 'PRESET_UPDATED') {
        set_updated_preset(undefined)
        set_updating_preset(undefined)
      }
    }
    window.addEventListener('message', handle_message)
    return () => window.removeEventListener('message', handle_message)
  }, [])

  const tabs = (
    <>
      <Header
        active_tab={active_tab}
        on_chat_tab_click={() => {
          set_active_tab('chat')
        }}
        on_api_tab_click={() => {
          set_active_tab('api')
        }}
      />
      <WebChatsTab
        vscode={vscode}
        is_visible={active_tab == 'chat'}
        on_preset_edit={(preset) => {
          set_updating_preset(preset)
        }}
      />
      <ApiToolsTab vscode={vscode} is_visible={active_tab == 'api'} />
    </>
  )

  const edit_preset_view = updating_preset && (
    <EditView back_label="EDIT PRESET" on_back_click={handle_back_click}>
      <EditPresetForm
        preset={updating_preset}
        on_update={handle_preset_update}
      />
    </EditView>
  )

  return (
    <>
      <Template edit_preset_slot={edit_preset_view} tabs_slot={tabs} />
    </>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(<App />)
