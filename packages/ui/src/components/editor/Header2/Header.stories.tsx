import { Header } from './Header'
import { useState } from 'react'

export default {
  component: Header
}

export const Default = () => {
  const [active_tab, set_active_tab] = useState<'chat' | 'tools' | 'settings'>(
    'chat'
  )
  const [active_mode, set_active_mode] = useState<'web' | 'api'>('web')

  return (
    <Header
      active_tab={active_tab}
      on_chat_tab_click={() => set_active_tab('chat')}
      on_tools_tab_click={() => set_active_tab('tools')}
      on_settings_tab_click={() => set_active_tab('settings')}
      active_mode={active_mode}
      on_mode_switch={set_active_mode}
    />
  )
}
