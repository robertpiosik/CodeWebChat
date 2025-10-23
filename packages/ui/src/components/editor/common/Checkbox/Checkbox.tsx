import { FC, ChangeEvent, MouseEvent } from 'react'
import styles from './Checkbox.module.scss'

type Props = {
  checked: boolean
  on_change: (checked: boolean) => void
  disabled?: boolean
  id?: string
  title?: string
  on_click?: (e: MouseEvent<HTMLInputElement>) => void
}

export const Checkbox: FC<Props> = (props) => {
  const handle_change = (e: ChangeEvent<HTMLInputElement>) => {
    props.on_change(e.target.checked)
  }

  return (
    <input
      type="checkbox"
      id={props.id}
      className={styles.checkbox}
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
