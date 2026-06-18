import { actions } from './actions'
import { general } from './general'
import { model_providers } from './model-providers'
import { sidebar } from './sidebar'
import { configurations } from './configurations'

export const translations = {
  ...sidebar,
  ...actions,
  ...general,
  ...model_providers,
  ...configurations
}
