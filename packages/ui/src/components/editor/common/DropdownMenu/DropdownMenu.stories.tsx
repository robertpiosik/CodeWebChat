import { DropdownMenu } from './DropdownMenu'

export default {
  component: DropdownMenu,
  decorators: [
    (Story: any) => (
      <div style={{ position: 'relative', width: '200px', height: '150px' }}>
        <Story />
      </div>
    )
  ]
}

const sample_items: DropdownMenu.Item[] = [
  {
    label: 'Select...',
    shortcut: 'cmd+return',
    on_click: () => alert('Select clicked')
  },
  {
    label: 'Copy prompt',
    shortcut: 'cmd+option+c',
    on_click: () => alert('Copy clicked')
  },
  {
    label: 'Another Action',
    on_click: () => alert('Another action clicked')
  }
]

export const Default = {
  args: {
    items: sample_items
  }
}
