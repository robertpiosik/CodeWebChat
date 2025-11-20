import { ModeButton } from './ModeButton'

export default {
  component: ModeButton
}

export const Primary = () => (
  <ModeButton
    label="Lorem ipsum"
    pre="Lorem ipsum dolor sit amet, consectetur adipiscing elit."
    on_click={() => console.log('ModeButton button clicked')}
  />
)
