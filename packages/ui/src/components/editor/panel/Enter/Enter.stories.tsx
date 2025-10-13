import { Enter } from './Enter'

export default {
  component: Enter
}

export const Primary = () => (
  <Enter
    label="Lorem ipsum"
    description="Lorem ipsum dolor sit amet, consectetur adipiscing elit."
    on_click={() => console.log('Enter button clicked')}
  />
)
