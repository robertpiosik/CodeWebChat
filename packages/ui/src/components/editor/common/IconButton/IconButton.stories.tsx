import { IconButton } from './IconButton'

export default {
  component: IconButton
}

export const Primary = () => (
  <IconButton
    codicon_icon="search"
    on_click={() => console.log('IconButton clicked')}
    title="Search"
  />
)

export const AsLink = () => (
  <IconButton
    codicon_icon="link-external"
    href="https://github.com"
    title="Open GitHub"
  />
)
