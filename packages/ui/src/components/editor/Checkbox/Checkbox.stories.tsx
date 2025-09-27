import { useState } from 'react'
import { Checkbox } from './Checkbox'

export default {
  component: Checkbox
}

export const Checked = () => {
  const [checked, set_checked] = useState(true)

  return (
    <Checkbox checked={checked} on_change={set_checked} title="Toggle me" />
  )
}

export const Unchecked = () => {
  const [checked, set_checked] = useState(false)

  return (
    <Checkbox checked={checked} on_change={set_checked} title="Toggle me" />
  )
}

export const DisabledUnchecked = () => (
  <Checkbox checked={false} on_change={() => {}} disabled title="Disabled" />
)

export const DisabledChecked = () => (
  <Checkbox checked={true} on_change={() => {}} disabled title="Disabled" />
)
