import styles from './Input.module.scss'

type Props = {
  id?: string
  type?: string
  value: string | number
  placeholder?: string
  max_width?: number
  width?: number
  onChange: (value: string) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
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

  return (
    <input
      id={props.id}
      type={props.type || 'text'}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      onKeyDown={props.onKeyDown}
      className={styles.input}
      placeholder={props.placeholder}
      style={Object.keys(style).length > 0 ? style : undefined}
      min={props.min}
      max={props.max}
      step={props.step}
    />
  )
}
