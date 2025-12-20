import styles from './Item.module.scss'
import React from 'react'

type Props = {
  title: string
  description: React.ReactNode
  slot_right?: React.ReactNode
  slot_below?: React.ReactNode
}

export const Item: React.FC<Props> = (props) => {
  return (
    <div className={styles.container}>
      <div className={styles.main}>
        <div className={styles.content}>
          <div className={styles.title}>{props.title}</div>
          <div className={styles.description} style={{ whiteSpace: 'normal' }}>
            {props.description}
          </div>
        </div>
        {props.slot_right && (
          <div className={styles.content__right}>{props.slot_right}</div>
        )}
      </div>
      {props.slot_below && (
        <div className={styles.below}>{props.slot_below}</div>
      )}
    </div>
  )
}
