import { ContextUtilisation } from './ContextUtilisation'

export default {
  component: ContextUtilisation
}

export const BelowThreshold = () => (
  <ContextUtilisation
    current_context_size={5000}
    context_size_warning_threshold={100000}
  />
)

export const AboveThreshold = () => (
  <ContextUtilisation
    current_context_size={120000}
    context_size_warning_threshold={100000}
  />
)

export const AtThreshold = () => (
  <ContextUtilisation
    current_context_size={100000}
    context_size_warning_threshold={100000}
  />
)
