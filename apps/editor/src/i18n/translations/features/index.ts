import { translations as search_files } from './search-files'
import { translations as checkpoints } from './checkpoints'
import { translations as context_restoration } from './context-restoration'

export const translations = {
  ...search_files,
  ...checkpoints,
  ...context_restoration
}
