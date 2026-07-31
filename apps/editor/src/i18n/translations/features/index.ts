import { translations as search_files } from './search-files'
import { translations as checkpoints } from './checkpoints'
import { translations as referencing_files } from './referencing-files'
import { translations as imported_files } from './imported-files'

export const translations = {
  ...search_files,
  ...checkpoints,
  ...referencing_files,
  ...imported_files
}
