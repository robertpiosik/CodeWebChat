import ReactDOM from 'react-dom/client'
import { ChatTab } from './tabs/chat/ChatTab'
import { ApiTab } from './tabs/api/ApiTab'
import { Header } from '@ui/components/editor/Header'
import { useState } from 'react'
import { Template } from '@ui/components/editor/Template'
import { Presets as UiPresets } from '@ui/components/editor/Presets'

import '@vscode/codicons/dist/codicon.css'
import '@ui/styles/global.scss'
import { EditView } from '@ui/components/editor/EditView'

const App = () => {
  const [active_tab, set_active_tab] = useState<'chat' | 'api'>('chat')
  const [editing_preset, set_editing_preset] = useState<UiPresets.Preset>()

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
      <ChatTab
        is_visible={active_tab == 'chat'}
        on_preset_edit={(preset) => {
          set_editing_preset(preset)
        }}
      />
      <ApiTab is_visible={active_tab == 'api'} />
    </>
  )

  const edit_preset = (
    <EditView
      back_label="Edit preset"
      on_back_click={() => {
        set_editing_preset(undefined)
      }}
    >
      x
    </EditView>
  )

  return (
    <>
      <Template
        edit_preset_slot={editing_preset && edit_preset}
        tabs_slot={tabs}
      />
    </>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(<App />)
