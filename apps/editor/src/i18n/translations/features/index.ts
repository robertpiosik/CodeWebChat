import { translations as search_files } from './search-files'
import { translations as checkpoints } from './checkpoints'
import { translations as referencing_files } from './referencing-files'
import { translations as imported_files } from './imported-files'
import { translations as context_restoration } from './context-restoration'

export const translations = {
  ...search_files,
  ...checkpoints,
  ...referencing_files,
  ...imported_files,
  ...context_restoration
}
