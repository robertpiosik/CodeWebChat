import { Switch } from './Switch'
import { useState } from 'react'

export default {
  component: Switch
}

export const Default = () => {
  const [value, set_value] = useState<'Web' | 'API'>('Web')
  return (
    <div style={{ display: 'flex' }}>
      <Switch value={value} onChange={set_value} />
    </div>
  )
}

export const InitialAPI = () => {
  const [value, set_value] = useState<'Web' | 'API'>('API')
  return (
    <div style={{ display: 'flex' }}>
      <Switch value={value} onChange={set_value} />
    </div>
  )
}
