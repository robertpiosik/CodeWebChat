import { Header } from './Header'
import { useState } from 'react'

export default {
  component: Header
}

export const Default = () => {
  const [active_tab, set_active_tab] = useState<string>('Home')
  const tabs = ['Home', 'Settings', 'Donations']

  return (
    <Header<string>
      tabs={tabs}
      active_tab={active_tab}
      on_tab_click={set_active_tab}
    />
  )
}
