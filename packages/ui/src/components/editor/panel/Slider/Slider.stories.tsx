import { Slider } from './Slider'
import { useState } from 'react'

export default {
  component: Slider
}

export const Primary = () => {
  const [value, set_value] = useState(0.7)
  return (
    <div style={{ padding: '20px', width: '300px' }}>
      <Slider
        value={value}
        onChange={(newValue) => set_value(newValue)}
        min={0}
        max={2}
      />
      <div
        style={{
          marginTop: '10px',
          fontSize: '14px',
          color: 'var(--vscode-foreground)'
        }}
      >
        Current value: {value}
      </div>
    </div>
  )
}
