import { header } from './header'
import { home } from './home'
import { checkpoints } from './checkpoints'
import { presets } from './presets'
import { configurations } from './configurations'
import { actions } from './actions'

export const panel = {
  ...header,
  ...home,
  ...checkpoints,
  ...presets,
  ...configurations,
  ...actions
}
