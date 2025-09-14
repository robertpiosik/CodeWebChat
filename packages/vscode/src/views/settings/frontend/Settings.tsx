import React, { useState } from 'react'
import { Layout } from '@ui/components/editor/settings/Layout'
import { NavigationItem } from '@ui/components/editor/settings/NavigationItem'

type NavItem =
  | 'model-providers'
  | 'code-completions'
  | 'edit-context'
  | 'intelligent-update'

const navigation_items: { id: NavItem; label: string; codicon: string }[] = [
  { id: 'model-providers', label: 'Model Providers', codicon: 'key' },
  { id: 'code-completions', label: 'Code Completions', codicon: 'tools' },
  { id: 'edit-context', label: 'Edit Context', codicon: 'tools' },
  { id: 'intelligent-update', label: 'Intelligent Update', codicon: 'tools' }
]

export const Settings = () => {
  const [active_item, setActiveItem] = useState<NavItem>('model-providers')
  return (
    <Layout
      title="Settings"
      navigation={
        <>
          {navigation_items.map((item) => (
            <NavigationItem
              key={item.id}
              label={item.label}
              codicon={item.codicon}
              is_active={active_item == item.id}
              on_click={() => setActiveItem(item.id)}
            />
          ))}
        </>
      }
    >
      Content for {active_item}
    </Layout>
  )
}
