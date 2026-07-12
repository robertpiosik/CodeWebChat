import { actions } from './actions'
import { common } from './common'
import { general } from './general'
import { sections } from './sections'
import { api_calls } from './api-calls'
import { chatbots } from './chatbots'

export const translations = {
  ...sections,
  ...actions,
  ...common,
  ...general,
  ...api_calls,
  ...chatbots
}
