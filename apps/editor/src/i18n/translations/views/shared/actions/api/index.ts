import { translations as create } from './create'
import { translations as pick_reasoning_effort } from './pick-reasoning-effort'
import { translations as update } from './update'
import { translations as upsert_provider } from './upsert-provider'

export const translations = {
  ...create,
  ...pick_reasoning_effort,
  ...update,
  ...upsert_provider
}
