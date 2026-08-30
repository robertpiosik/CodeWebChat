import { TargetButton } from './TargetButton'

export default {
  component: TargetButton
}

export const Primary = () => (
  <TargetButton
    label="Lorem ipsum"
    on_click={() => console.log('TargetButton button clicked')}
  />
)
