import { PromptTypeButton } from './PromptTypeButton'

export default {
  component: PromptTypeButton
}

export const Default = () => (
  <PromptTypeButton
    label="Default Button"
    icon="gear"
    on_click={() => console.log('Clicked')}
  />
)

export const WithIcon = () => (
  <PromptTypeButton
    label="Run Prompt"
    icon="play"
    on_click={() => console.log('Clicked')}
  />
)

export const Active = () => (
  <PromptTypeButton
    label="Active Button"
    icon="check"
    is_active
    on_click={() => console.log('Clicked')}
  />
)

export const Compact = () => (
  <PromptTypeButton
    label="Compact Button"
    icon="gear"
    is_compact
    on_click={() => console.log('Clicked')}
  />
)

export const WithKeycap = () => (
  <PromptTypeButton
    label="Run Prompt"
    icon="play"
    keycap_char="E"
    on_click={() => console.log('Clicked')}
  />
)
