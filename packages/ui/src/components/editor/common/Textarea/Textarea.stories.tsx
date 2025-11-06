import { useState } from 'react'
import { Textarea } from './Textarea'

export default {
  component: Textarea
}

export const Primary = () => {
  const [value, set_value] = useState('')

  return (
    <Textarea
      value={value}
      on_change={set_value}
      placeholder="Enter text here"
      min_rows={3}
    />
  )
}

export const WithValue = () => {
  const [value, set_value] = useState(
    'Initial value\nThis is a multiline text area.'
  )

  return (
    <Textarea
      value={value}
      on_change={set_value}
      placeholder="Will be ignored because value is set"
      min_rows={3}
    />
  )
}
