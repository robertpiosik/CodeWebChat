import { ModeButton } from './ModeButton'

export default {
  component: ModeButton
}

export const Primary = () => (
  <ModeButton
    label="Lorem ipsum"
    on_click={() => console.log('ModeButton button clicked')}
  />
)
