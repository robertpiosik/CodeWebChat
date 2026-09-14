import { translations as common } from './common'
import { translations as create } from './create'
import { translations as pick_reasoning_effort } from './pick-reasoning-effort'
import { translations as pick_extended_provider } from './pick-extended-provider'
import { translations as update } from './update'
import { translations as add_provider } from './add-provider'
import { translations as delete_translations } from './delete'

export const translations = {
  ...common,
  ...create,
  ...pick_reasoning_effort,
  ...pick_extended_provider,
  ...update,
  ...add_provider,
  ...delete_translations
}
