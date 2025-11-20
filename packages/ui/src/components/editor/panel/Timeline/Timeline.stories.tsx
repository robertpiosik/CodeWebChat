import { useState } from 'react'
import { Timeline, TimelineItemProps } from './Timeline'

export default {
  component: Timeline
}

const initialItems: TimelineItemProps[] = [
  {
    id: 1,
    timestamp: Date.now() - 5 * 60 * 1000,
    label: 'Initial checkpoint',
    description: 'Created the basic project structure and initial setup.',
    is_starred: true
  },
  {
    id: 2,
    timestamp: Date.now() - 15 * 60 * 1000,
    label: 'Added Authentication',
    description: 'Implemented user login and registration functionality.'
  },
  {
    id: 3,
    timestamp: Date.now() - 30 * 60 * 1000,
    label: 'Refactored UI components',
    description:
      'Split large components into smaller, reusable ones. Also improved styling across the application.'
  },
  {
    id: 4,
    timestamp: Date.now() - 60 * 60 * 1000,
    label: 'Fixed critical bug',
    description: 'Resolved an issue where users could not log out properly.',
    is_starred: true
  },
  {
    id: 5,
    timestamp: Date.now() - 2 * 60 * 60 * 1000,
    label: 'Deployed to staging',
    description:
      'Pushed the latest changes to the staging environment for testing.'
  }
]

export const Default = () => {
  const [items, set_items] = useState(initialItems)
  const handle_toggle_starred = (id: string | number) => {
    set_items((prevItems) =>
      prevItems.map((item) =>
        item.id === id ? { ...item, is_starred: !item.is_starred } : item
      )
    )
  }
  return (
    <div
      style={{
        padding: '20px',
        backgroundColor: 'var(--vscode-sideBar-background)'
      }}
    >
      <Timeline
        items={items}
        on_toggle_starred={handle_toggle_starred}
        on_label_click={(id) => alert(`Restore checkpoint: ${id}`)}
      />
    </div>
  )
}

export const SingleItem = () => (
  <div
    style={{
      padding: '20px',
      backgroundColor: 'var(--vscode-sideBar-background)'
    }}
  >
    <Timeline
      items={[initialItems[0]]}
      on_toggle_starred={() => {}}
      on_label_click={(id) => alert(`Restore checkpoint: ${id}`)}
    />
  </div>
)

export const NoDescription = () => (
  <div
    style={{
      padding: '20px',
      backgroundColor: 'var(--vscode-sideBar-background)'
    }}
  >
    <Timeline
      items={[
        {
          id: 1,
          timestamp: Date.now() - 1 * 60 * 1000,
          label: 'Quick save',
          is_starred: false
        }
      ]}
      on_toggle_starred={() => {}}
      on_label_click={(id) => alert(`Restore checkpoint: ${id}`)}
    />
  </div>
)
