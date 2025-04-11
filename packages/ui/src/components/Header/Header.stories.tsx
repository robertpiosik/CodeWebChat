import { Header } from './Header'
import { useState } from 'react'

export default {
  component: Header
}

export const Default = () => {
  const [activeTab, setActiveTab] = useState<'chat' | 'api'>('chat')

  return (
    <Header
      active_tab={activeTab}
      on_chat_tab_click={() => setActiveTab('chat')}
      on_api_tab_click={() => setActiveTab('api')}
    />
  )
}
