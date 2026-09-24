import { translations as create } from './create'
import { translations as delete_translations } from './delete'
import { translations as pick_agent } from './pick-agent'

export const translations = {
  ...create,
  ...delete_translations,
  ...pick_agent
}