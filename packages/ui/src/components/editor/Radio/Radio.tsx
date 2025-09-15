import { FC, ChangeEvent, MouseEvent } from 'react'
import styles from './Radio.module.scss'

type Props = {
  checked: boolean
  on_change: () => void
  disabled?: boolean
  id?: string
  name?: string
  title?: string
  on_click?: (e: MouseEvent<HTMLInputElement>) => void
}

export const Radio: FC<Props> = (props) => {
  const handle_change = (e: ChangeEvent<HTMLInputElement>) => {
    props.on_change()
  }

  return (
    <input
      type="radio"
      id={props.id}
      name={props.name}
      className={styles.radio}
      checked={props.checked}
      onChange={handle_change}
      disabled={props.disabled}
      title={props.title}
      onClick={(e) => {
        e.stopPropagation()
        props.on_click?.(e)
      }}
    />
  )
}
