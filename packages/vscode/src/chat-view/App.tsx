import ReactDOM from 'react-dom/client'
import { ChatTab } from './tabs/chat/ChatTab'
import { ApiTab } from './tabs/api/ApiTab'
import { Header } from '@ui/components/editor/Header'
import { useState } from 'react'

import '@vscode/codicons/dist/codicon.css'
import '@ui/styles/global.scss'
import { Template } from '@ui/components/editor/Template'

const App = () => {
  const [active_tab, set_active_tab] = useState<'chat' | 'api'>('chat')

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
      <ChatTab is_visible={active_tab == 'chat'} />
      <ApiTab is_visible={active_tab == 'api'} />
    </>
  )

  return (
    <>
      <Template tabs_slot={tabs} />
    </>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(<App />)
