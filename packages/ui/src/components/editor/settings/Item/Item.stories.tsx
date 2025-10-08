import type { Meta, StoryObj } from '@storybook/react'
import { Item } from './Item'

const meta: Meta<typeof Item> = {
  component: Item,
  decorators: [
    (Story) => (
      <div
        style={{
          maxWidth: '600px',
          padding: '1rem',
          backgroundColor: 'var(--vscode-sideBar-background)',
          color: 'var(--vscode-foreground)'
        }}
      >
        <Story />
      </div>
    )
  ]
}

export default meta
type Story = StoryObj<typeof Item>

export const Default: Story = {
  args: {
    title: 'Model Provider',
    description: 'Select the model provider to use for this configuration.',
    slot: <div>slot</div>
  }
}

export const SlotBelow: Story = {
  args: {
    title: 'API Key',
    description:
      'Enter your API key for the selected model provider. It will be stored securely.',
    slot: <div>slot</div>,
    slot_placement: 'below'
  }
}
