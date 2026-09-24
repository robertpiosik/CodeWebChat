import { translations as api } from './api'
import { translations as common } from './common'
import { translations as web } from './web'
import { translations as agent } from './agent'

export const translations = {
  ...api,
  ...common,
  ...web,
  ...agent
}
