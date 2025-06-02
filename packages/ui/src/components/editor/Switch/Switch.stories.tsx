import { Switch } from './Switch'
import { useState } from 'react'

export default {
  component: Switch
}

export const Default = () => {
  const [value, set_value] = useState<'Web' | 'API'>('Web')
  return (
    <div style={{ display: 'flex' }}>
      <Switch<'Web' | 'API'>
        value={value}
        on_change={set_value}
        options={['Web', 'API']}
      />
    </div>
  )
}

export const InitialAPI = () => {
  const [value, set_value] = useState<'Web' | 'API'>('API')
  return (
    <div style={{ display: 'flex' }}>
      <Switch<'Web' | 'API'>
        value={value}
        on_change={set_value}
        options={['Web', 'API']}
      />
    </div>
  )
}

export const MultipleOptions = () => {
  const [value, set_value] = useState<'Light' | 'Dark' | 'System'>('Light')
  return (
    <div style={{ display: 'flex' }}>
      <Switch<'Light' | 'Dark' | 'System'>
        value={value}
        on_change={set_value}
        options={['Light', 'Dark', 'System']}
      />
    </div>
  )
}
