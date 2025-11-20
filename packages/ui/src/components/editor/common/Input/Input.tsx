import styles from './Input.module.scss'

type Props = {
  id?: string
  type?: string
  value: string | number
  placeholder?: string
  max_width?: number
  width?: number
  on_change: (value: string) => void
  on_key_down?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  min?: number
  max?: number
  step?: number
}

export const Input: React.FC<Props> = (props) => {
  const style: React.CSSProperties = {}
  if (props.max_width) {
    style.maxWidth = `${props.max_width}px`
  }
  if (props.width) {
    style.width = `${props.width}px`
  }

  const numeric_value = Number(props.value)
  const is_out_of_range =
    !Number.isNaN(numeric_value) &&
    ((props.min !== undefined && numeric_value < props.min) ||
      (props.max !== undefined && numeric_value > props.max))

  const class_names = [styles.input]
  if (is_out_of_range) {
    class_names.push(styles.invalid)
  }

  return (
    <input
      id={props.id}
      type={props.type || 'text'}
      value={props.value}
      onChange={(e) => props.on_change(e.target.value)}
      onKeyDown={props.on_key_down}
      className={class_names.join(' ')}
      placeholder={props.placeholder}
      style={Object.keys(style).length > 0 ? style : undefined}
      min={props.min}
      max={props.max}
      step={props.step}
    />
  )
}
