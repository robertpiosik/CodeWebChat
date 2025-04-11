import ReactDOM from 'react-dom/client'
import { ChatTab } from './ChatTab'

import '@vscode/codicons/dist/codicon.css'
import '@ui/styles/global.scss'
import { Header } from '@ui/components/Header'
import { useState } from 'react'

const App = () => {
  const [active_tab, set_active_tab] = useState<'chat' | 'api'>('chat')



  return (
    <>
      <Header active_tab={active_tab} on_chat_tab_click={() =>{
         
      }} on_api_tab_click={() => {
        set_active_tab('api')
      }} />
      <ChatTab />
    </>
  )
}

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement)
root.render(<App />)
