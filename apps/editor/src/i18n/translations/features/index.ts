import { translations as search_files } from './search-files'
import { translations as checkpoints } from './checkpoints'
import { translations as context_restoration } from './context-restoration'
import { translations as headless_cli_invocation } from './headless-cli-invocation'

export const translations = {
  ...search_files,
  ...checkpoints,
  ...context_restoration,
  ...headless_cli_invocation
}
