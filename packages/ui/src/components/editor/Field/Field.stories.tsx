import { useState } from 'react'
import { Field } from './Field'
import { Input } from '../Input'
import { Checkbox } from '../Checkbox'

export default {
  component: Field
}

export const TextInput = () => {
  const [value, set_value] = useState('')

  return (
    <Field label="Username" html_for="username">
      <Input
        value={value}
        onChange={set_value}
        placeholder="Enter your username"
      />
    </Field>
  )
}

export const WithInfo = () => {
  const [value, set_value] = useState('')

  return (
    <Field
      label="API Key"
      html_for="api-key"
      info="Your API key will be stored securely."
    >
      <Input value={value} onChange={set_value} placeholder="Enter API key" />
    </Field>
  )
}

export const CheckboxField = () => {
  const [checked, set_checked] = useState(false)

  return (
    <Field label="Enable feature" html_for="enable-feature">
      <Checkbox id="enable-feature" checked={checked} on_change={set_checked} />
    </Field>
  )
}
