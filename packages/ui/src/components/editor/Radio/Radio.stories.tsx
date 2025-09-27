import { useState } from 'react'
import { Radio } from './Radio'

export default {
  component: Radio
}

export const Checked = () => {
  const [checked, set_checked] = useState(true)

  return (
    <Radio
      checked={checked}
      on_change={() => set_checked(!checked)}
      title="Checked radio button"
    />
  )
}

export const Unchecked = () => {
  const [checked, set_checked] = useState(false)

  return (
    <Radio
      checked={checked}
      on_change={() => set_checked(!checked)}
      title="Unchecked radio button"
    />
  )
}

export const DisabledUnchecked = () => (
  <Radio
    checked={false}
    on_change={() => {}}
    disabled
    title="Disabled unchecked"
  />
)

export const DisabledChecked = () => (
  <Radio
    checked={true}
    on_change={() => {}}
    disabled
    title="Disabled checked"
  />
)
