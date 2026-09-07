import { translations as actions } from './actions'
import { translations as common } from './common'
import { translations as general } from './general'
import { translations as sections } from './sections'
import { translations as api } from './api'
import { translations as web } from './web'
import { translations as edit_model_provider_form } from './edit-model-provider-form'
import { translations as edit_template_form } from './edit-template-form'

export const translations = {
  ...sections,
  ...actions,
  ...common,
  ...general,
  ...api,
  ...web,
  ...edit_model_provider_form,
  ...edit_template_form
}
