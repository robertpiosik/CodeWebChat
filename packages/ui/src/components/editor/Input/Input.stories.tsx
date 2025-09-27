import { useState } from 'react'
import { Input } from './Input'

export default {
  component: Input
}

export const Primary = () => {
  const [value, set_value] = useState('')

  return (
    <Input value={value} onChange={set_value} placeholder="Enter text here" />
  )
}

export const WithValue = () => {
  const [value, set_value] = useState('Initial value')

  return (
    <Input
      value={value}
      onChange={set_value}
      placeholder="Will be ignored because value is set"
    />
  )
}
