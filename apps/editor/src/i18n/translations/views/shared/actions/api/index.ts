import { translations as common } from './common'
import { translations as create } from './create'
import { translations as pick_reasoning_effort } from './pick-reasoning-effort'
import { translations as update } from './update'
import { translations as upsert_provider } from './upsert-provider'
import { translations as delete_translations } from './delete'

export const translations = {
  ...common,
  ...create,
  ...pick_reasoning_effort,
  ...update,
  ...upsert_provider,
  ...delete_translations
}
