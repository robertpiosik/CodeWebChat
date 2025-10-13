import { useState } from 'react'
import styles from './Slider.module.scss'

type Props = {
  value: number
  onChange: (value: number) => void
}

export const Slider: React.FC<Props> = (props) => {
  const [value, set_value] = useState(props.value)

  return (
    <div className={styles.container}>
      <input
        type="number"
        min="0"
        max="2"
        step="0.05"
        value={value}
        onChange={(e) => {
          set_value(parseFloat(e.target.value))
          const value = parseFloat(e.target.value)
          if (!isNaN(value) && value >= 0 && value <= 1) {
            props.onChange(value)
          }
        }}
        className={styles.container__input}
      />
      <input
        type="range"
        min="0"
        max="2"
        step="0.05"
        value={value}
        onChange={(e) => set_value(parseFloat(e.target.value))}
        onMouseUp={() => props.onChange(value)}
        className={styles.container__slider}
      />
    </div>
  )
}
