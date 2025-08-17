import { Button } from './Button'

export default {
  component: Button
}

export const Primary = () => (
  <Button on_click={() => console.log('Clicked')}>Primary Button</Button>
)

export const WithIcon = () => (
  <Button on_click={() => console.log('Clicked')} codicon="send">
    Button with Icon
  </Button>
)

export const Disabled = () => (
  <Button on_click={() => console.log('Clicked')} disabled>
    Disabled Button
  </Button>
)

export const Secondary = () => (
  <Button on_click={() => console.log('Clicked')} is_secondary>
    Secondary Button
  </Button>
)

export const SecondaryWithIcon = () => (
  <Button on_click={() => console.log('Clicked')} is_secondary codicon="send">
    Secondary Button with Icon
  </Button>
)

export const SecondaryDisabled = () => (
  <Button on_click={() => console.log('Clicked')} is_secondary disabled>
    Secondary Disabled Button
  </Button>
)
