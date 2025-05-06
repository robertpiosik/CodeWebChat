import { EditFormatSelector } from './EditFormatSelector'
import { useState } from 'react'
import { EditFormat } from '../../../../../shared/src/types/edit-format'

export default {
  component: EditFormatSelector
}

export const Default = () => {
  const [format, set_format] = useState<EditFormat>('truncated')

  return <EditFormatSelector format={format} on_change={set_format} />
}
