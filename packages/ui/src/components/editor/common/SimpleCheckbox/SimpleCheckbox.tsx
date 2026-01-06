import { FC, ChangeEvent } from 'react'
import styles from './SimpleCheckbox.module.scss'

type Props = {
  checked: boolean
  on_change: (checked: boolean) => void
  title?: string
}

export const SimpleCheckbox: FC<Props> = (props) => {
  const handle_change = (e: ChangeEvent<HTMLInputElement>) => {
    props.on_change(e.target.checked)
  }

  return (
    <input
      type="checkbox"
      className={styles.checkbox}
      checked={props.checked}
      onChange={handle_change}
      onClick={(e) => e.stopPropagation()}
      title={props.title}
    />
  )
}
