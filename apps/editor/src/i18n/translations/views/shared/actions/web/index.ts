import { translations as create } from './create'
import { translations as delete_translations } from './delete'
import { translations as pick_chatbot } from './pick-chatbot'
import { translations as pick_model } from './pick-model'
import { translations as update } from './update'

export const translations = {
  ...create,
  ...delete_translations,
  ...pick_chatbot,
  ...pick_model,
  ...update
}
