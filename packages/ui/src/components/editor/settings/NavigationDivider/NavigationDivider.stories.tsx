import type { Meta, StoryObj } from '@storybook/react'
import { NavigationDivider } from './NavigationDivider'

const meta: Meta<typeof NavigationDivider> = {
  component: NavigationDivider,
  decorators: [
    (Story) => (
      <div
        style={{
          width: '200px',
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
type Story = StoryObj<typeof NavigationDivider>

export const Default: Story = {
  render: () => (
    <>
      <div>Item 1</div>
      <NavigationDivider />
      <div>Item 2</div>
    </>
  )
}

export const WithText: Story = {
  render: () => (
    <>
      <div>Item 1</div>
      <NavigationDivider text="API Tools" />
      <div>Item 2</div>
      <div>Item 3</div>
    </>
  )
}
