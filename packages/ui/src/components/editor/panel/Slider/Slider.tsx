import { useEffect, useState } from 'react'
import { Input } from '../../common/Input'
import styles from './Slider.module.scss'

type Props = {
  value: number
  onChange: (value: number) => void
  min: number
  max: number
}

export const Slider: React.FC<Props> = (props) => {
  const [value, set_value] = useState(props.value)

  useEffect(() => {
    set_value(props.value)
  }, [props.value])

  const handleInputChange = (newValue: string) => {
    const numValue = parseFloat(newValue)
    if (!isNaN(numValue)) {
      set_value(numValue)
      if (numValue >= props.min && numValue <= props.max) {
        props.onChange(numValue)
      }
    }
  }

  const percentage = ((value - props.min) / (props.max - props.min)) * 100

  return (
    <div className={styles.container}>
      <Input
        type="number"
        min={props.min}
        max={props.max}
        step={0.05}
        value={value}
        on_change={handleInputChange}
        width={60}
      />
      <input
        type="range"
        min={String(props.min)}
        max={String(props.max)}
        step="0.05"
        value={value}
        onChange={(e) => set_value(parseFloat(e.target.value))}
        onMouseUp={() => props.onChange(value)}
        className={styles.container__slider}
        style={{ '--value-percent': `${percentage}%` } as any}
      />
    </div>
  )
}
