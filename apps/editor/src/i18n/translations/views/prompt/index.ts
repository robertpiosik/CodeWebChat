import { translations as handlers } from './handlers'
import { translations as utils } from './utils'
import { translations as prompt_view_provider } from './prompt-view-provider'

export const translations = {
  ...handlers,
  ...utils,
  ...prompt_view_provider
}
