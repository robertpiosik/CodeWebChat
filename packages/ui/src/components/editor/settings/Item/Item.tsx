import styles from './Item.module.scss'
import React from 'react'
import cn from 'classnames'

type Props = {
  title: string
  description: React.ReactNode
  slot: React.ReactNode
  slot_placement?: 'right' | 'below'
}

export const Item: React.FC<Props> = (props) => {
  const is_below = props.slot_placement == 'below'

  return (
    <div
      className={cn(styles.container, {
        [styles['container--below']]: is_below
      })}
    >
      <div className={styles.content}>
        <div className={styles.title}>{props.title}</div>
        <div className={styles.description} style={{ whiteSpace: 'normal' }}>
          {props.description}
        </div>
      </div>
      <div className={styles.slot}>{props.slot}</div>
    </div>
  )
}
