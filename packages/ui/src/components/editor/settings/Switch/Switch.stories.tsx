import type { Meta, StoryObj } from '@storybook/react'
import { Switch } from './Switch'
import { useState } from 'react'

const meta: Meta<typeof Switch> = {
  component: Switch,
  decorators: [
    (Story) => (
      <div
        style={{
          padding: '1rem',
          backgroundColor: 'var(--vscode-sideBar-background)'
        }}
      >
        <Story />
      </div>
    )
  ]
}

export default meta
type Story = StoryObj<typeof Switch>

export const Default: Story = {
  render: () => {
    const [checked, setChecked] = useState(false)
    return <Switch checked={checked} on_change={setChecked} />
  }
}

export const Checked: Story = {
  render: () => {
    const [checked, setChecked] = useState(true)
    return <Switch checked={checked} on_change={setChecked} />
  }
}

export const Disabled: Story = {
  render: () => {
    return (
      <div style={{ display: 'flex', gap: '1rem' }}>
        <Switch checked={false} on_change={() => {}} disabled />
        <Switch checked={true} on_change={() => {}} disabled />
      </div>
    )
  }
}
