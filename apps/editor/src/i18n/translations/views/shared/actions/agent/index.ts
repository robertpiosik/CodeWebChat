import { translations as create } from './create'
import { translations as delete_translations } from './delete'
import { translations as pick_agent } from './pick-agent'
import { translations as pick_example_flags } from './pick-example-flags'

export const translations = {
  ...create,
  ...delete_translations,
  ...pick_agent,
  ...pick_example_flags
}
