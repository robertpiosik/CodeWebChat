import { IconAccentButton } from './IconAccentButton'

export default {
  component: IconAccentButton
}

export const Default = () => (
  <IconAccentButton
    label="Default Button"
    icon="gear"
    on_click={() => console.log('Clicked')}
  />
)

export const WithIcon = () => (
  <IconAccentButton
    label="Run Prompt"
    icon="play"
    on_click={() => console.log('Clicked')}
  />
)

export const Active = () => (
  <IconAccentButton
    label="Active Button"
    icon="check"
    is_active
    on_click={() => console.log('Clicked')}
  />
)

export const ActiveBlue = () => (
  <IconAccentButton
    label="Active Blue Button"
    icon="check"
    is_active
    active_color="blue"
    on_click={() => console.log('Clicked')}
  />
)

export const ActiveGreen = () => (
  <IconAccentButton
    label="Active Green Button"
    icon="check"
    is_active
    active_color="green"
    on_click={() => console.log('Clicked')}
  />
)

export const ActiveOrange = () => (
  <IconAccentButton
    label="Active Orange Button"
    icon="check"
    is_active
    active_color="orange"
    on_click={() => console.log('Clicked')}
  />
)

export const ActiveRed = () => (
  <IconAccentButton
    label="Active Red Button"
    icon="check"
    is_active
    active_color="red"
    on_click={() => console.log('Clicked')}
  />
)

export const Compact = () => (
  <IconAccentButton
    label="Compact Button"
    icon="gear"
    is_compact
    on_click={() => console.log('Clicked')}
  />
)
