import { ViewTypeButton } from './ViewTypeButton'

export default {
  component: ViewTypeButton
}

export const Primary = () => (
  <ViewTypeButton
    label="Lorem ipsum"
    pre="Lorem ipsum dolor sit amet, consectetur adipiscing elit."
    on_click={() => console.log('ViewTypeButton button clicked')}
  />
)
