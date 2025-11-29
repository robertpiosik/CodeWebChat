import { useState } from 'react'
import { PresetOption } from './PresetOption'

export default {
  component: PresetOption
}

export const Default = () => {
  const [checked, set_checked] = useState(false)

  return (
    <PresetOption
      label="Temporary chat"
      checked={checked}
      on_change={set_checked}
    />
  )
}

export const Checked = () => {
  const [checked, set_checked] = useState(true)

  return (
    <PresetOption
      label="Temporary chat"
      checked={checked}
      on_change={set_checked}
    />
  )
}

export const Disabled = () => (
  <PresetOption
    label="Temporary chat"
    checked={false}
    on_change={() => {}}
    disabled
    disabled_reason="This option is disabled for a reason."
  />
)

export const DisabledChecked = () => (
  <PresetOption
    label="Temporary chat"
    checked={true}
    on_change={() => {}}
    disabled
    disabled_reason="This option is disabled for a reason."
  />
)