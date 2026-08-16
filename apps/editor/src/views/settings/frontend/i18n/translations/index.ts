import { translations as actions } from './actions'
import { translations as common } from './common'
import { translations as general } from './general'
import { translations as sections } from './sections'
import { translations as api_calls } from './api-calls'
import { translations as chatbots } from './chatbots'
import { translations as edit_model_provider_form } from './edit-model-provider-form'
import { translations as edit_template_form } from './edit-template-form'

export const translations = {
  ...sections,
  ...actions,
  ...common,
  ...general,
  ...api_calls,
  ...chatbots,
  ...edit_model_provider_form,
  ...edit_template_form
}
