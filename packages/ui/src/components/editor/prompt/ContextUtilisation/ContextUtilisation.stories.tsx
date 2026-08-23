import { ContextUtilisation } from './ContextUtilisation'

export default {
  component: ContextUtilisation
}

export const Basic = () => <ContextUtilisation current_context_size={5000} />

export const Disabled = () => (
  <ContextUtilisation current_context_size={5000} is_context_disabled />
)
