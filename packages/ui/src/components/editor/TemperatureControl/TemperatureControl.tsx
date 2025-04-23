import React from 'react'
import styles from './TemperatureControl.module.scss'

type Props = {
  value: number
  onChange: (value: number) => void
}

export const TemperatureControl: React.FC<Props> = ({ value, onChange }) => {
  return (
    <div className={styles.temperature}>
      <input
        type="number"
        min="0"
        max="1"
        step="0.01"
        value={value}
        onChange={(e) => {
          const value = parseFloat(e.target.value)
          if (!isNaN(value) && value >= 0 && value <= 1) {
            onChange(value)
          }
        }}
        className={styles.temperature__input}
      />
      <input
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={styles.temperature__slider}
      />
    </div>
  )
}
