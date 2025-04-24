import React, { useState } from 'react'
import styles from './TemperatureControl.module.scss'

type Props = {
  value: number
  onChange: (value: number) => void
}

export const TemperatureControl: React.FC<Props> = (props) => {
  const [temp, set_temp] = useState(props.value)

  return (
    <div className={styles.temperature}>
      <input
        type="number"
        min="0"
        max="1"
        step="0.01"
        value={temp}
        onChange={(e) => {
          set_temp(parseFloat(e.target.value))
          const value = parseFloat(e.target.value)
          if (!isNaN(value) && value >= 0 && value <= 1) {
            props.onChange(value)
          }
        }}
        className={styles.temperature__input}
      />
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={temp}
        onChange={(e) => set_temp(parseFloat(e.target.value))}
        onMouseUp={() => props.onChange(temp)}
        className={styles.temperature__slider}
      />
    </div>
  )
}
