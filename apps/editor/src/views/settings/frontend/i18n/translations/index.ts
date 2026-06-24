import { actions } from './actions'
import { preferences } from './preferences'
import { model_providers } from './model-providers'
import { sections } from './sections'
import { configurations } from './configurations'
import { web_configurations } from './web-configurations'

export const translations = {
  ...sections,
  ...actions,
  ...preferences,
  ...model_providers,
  ...configurations,
  ...web_configurations
}
