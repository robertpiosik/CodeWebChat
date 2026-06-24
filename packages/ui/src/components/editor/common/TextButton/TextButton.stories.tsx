import { TextButton } from './TextButton'

export default {
  component: TextButton,
  decorators: [
    (Story: any) => (
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

export const Primary = () => (
  <TextButton
    on_click={() => console.log('TextButton clicked')}
    title="This is a tooltip"
  >
    Click me
  </TextButton>
)

export const Disabled = () => (
  <TextButton on_click={() => console.log('This will not be called')} disabled>
    Disabled button
  </TextButton>
)
