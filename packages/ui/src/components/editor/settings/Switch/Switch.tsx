import React from 'react'
import cn from 'classnames'
import styles from './Switch.module.scss'

type Props = {
  checked: boolean
  on_change: (checked: boolean) => void
  disabled?: boolean
}

export const Switch: React.FC<Props> = (props) => {
  return (
    <label
      className={cn(styles.switch, {
        [styles.checked]: props.checked,
        [styles.disabled]: props.disabled
      })}
    >
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(e) => props.on_change(e.target.checked)}
        disabled={props.disabled}
      />
      <span className={styles.slider} />
    </label>
  )
}
