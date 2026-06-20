import { actions } from './actions'
import { general } from './general'
import { model_providers } from './model-providers'
import { sections } from './sections'
import { configurations } from './configurations'
import { web_configurations } from './web-configurations'

export const translations = {
  ...sections,
  ...actions,
  ...general,
  ...model_providers,
  ...configurations,
  ...web_configurations
}
