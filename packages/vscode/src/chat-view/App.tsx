import ReactDOM from 'react-dom/client'
import { ChatTab } from './tabs/chat/ChatTab'
import { ApiTab } from './tabs/api/ApiTab'
import { Header } from '@ui/components/editor/Header'
import { useState } from 'react'

import '@vscode/codicons/dist/codicon.css'
import '@ui/styles/global.scss'

const App = () => {
  const [active_tab, set_active_tab] = useState<'chat' | 'api'>('chat')

  return (
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
      {active_tab == 'chat' && <ChatTab />}
      {active_tab == 'api' && <ApiTab />}
    </>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(<App />)
