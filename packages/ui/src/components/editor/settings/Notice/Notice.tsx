import styles from './Notice.module.scss'
import React from 'react'
import cn from 'classnames'

type Props = {
  children: React.ReactNode
  type: 'info' | 'warning'
  slot_right?: React.ReactNode
}

export const Notice: React.FC<Props> = (props) => {
  return (
    <div
      className={cn(styles.container, {
        [styles['container--info']]: props.type == 'info',
        [styles['container--warning']]: props.type == 'warning'
      })}
    >
      <div
        className={cn(styles.left, {
          [styles['left--warning']]: props.type == 'warning'
        })}
      >
        <span
          className={cn(
            'codicon',
            props.type == 'info' ? 'codicon-info' : 'codicon-warning'
          )}
        />
        <span className={styles.content}>{props.children}</span>
      </div>
      {props.slot_right && <div>{props.slot_right}</div>}
    </div>
  )
}
