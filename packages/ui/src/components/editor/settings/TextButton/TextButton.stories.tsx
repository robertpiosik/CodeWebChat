import type { Meta, StoryObj } from '@storybook/react'
import { TextButton } from './TextButton'

const meta: Meta<typeof TextButton> = {
  component: TextButton,
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
type Story = StoryObj<typeof TextButton>

export const Default: Story = {
  args: {
    children: 'Manage configurations',
    on_click: () => console.log('Clicked')
  }
}

export const Disabled: Story = {
  args: {
    children: 'Manage configurations',
    on_click: () => console.log('Clicked'),
    disabled: true
  }
}
