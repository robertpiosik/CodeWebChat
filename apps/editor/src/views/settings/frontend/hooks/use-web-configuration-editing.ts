import { useState } from 'react'
import { WebConfiguration } from '@shared/types/web-configuration'

export const use_web_configuration_editing = () => {
  const [updating_web_configuration, set_updating_web_configuration] = useState<WebConfiguration>()

  return {
    updating_web_configuration,
    set_updating_web_configuration
  }
}
