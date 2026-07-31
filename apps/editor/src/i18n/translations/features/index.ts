import { translations as search_files } from './search-files'
import { translations as checkpoints } from './checkpoints'
import { translations as referencing_files } from './referencing-files'

export const translations = {
  ...search_files,
  ...checkpoints,
  ...referencing_files
}
