import styles from './Input.module.scss'

type Props = {
  id?: string
  type?: string
  value: string
  placeholder?: string
  max_width?: number
  onChange: (value: string) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

export const Input: React.FC<Props> = (props) => {
  const style = props.max_width
    ? { maxWidth: `${props.max_width}px` }
    : undefined

  return (
    <input
      id={props.id}
      type={props.type || 'text'}
      value={props.value}
      onChange={(e) => props.onChange(e.target.value)}
      onKeyDown={props.onKeyDown}
      className={styles.input}
      placeholder={props.placeholder}
      style={style}
    />
  )
}
