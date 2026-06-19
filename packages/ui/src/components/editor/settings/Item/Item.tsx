import styles from './Item.module.scss'
import React, { useState } from 'react'
import cn from 'classnames'
import { IconButton } from '../../common/IconButton/IconButton'

type Props = {
  title: string
  description?: React.ReactNode
  slot_right?: React.ReactNode
  children?: React.ReactNode
  is_toggleable?: boolean
  translations?: {
    expand: string
    collapse: string
  }
}

export const Item: React.FC<Props> = (props) => {
  const [is_expanded, set_is_expanded] = useState(false)

  return (
    <div
      className={cn(styles.container, {
        [styles['container--hoverable']]: props.is_toggleable && !is_expanded
      })}
    >
      <div
        className={cn(styles.main, {
          [styles['main--toggleable']]: props.is_toggleable,
        })}
        onClick={props.is_toggleable ? () => set_is_expanded(!is_expanded) : undefined}
      >
        <div className={styles.content}>
          <div className={styles.title}>{props.title}</div>
          {props.description && (
            <div
              className={styles.description}
              style={{ whiteSpace: 'normal' }}
            >
              {props.description}
            </div>
          )}
        </div>
        {(props.slot_right || props.is_toggleable) && (
          <div className={styles.content__right}>
            {props.slot_right}
            {props.is_toggleable && (
              <IconButton
                codicon_icon={is_expanded ? 'chevron-up' : 'chevron-down'}
                title={is_expanded ? props.translations?.collapse : props.translations?.expand}
              />
            )}
          </div>
        )}
      </div>
      {props.children && (!props.is_toggleable || is_expanded) && (
        <div className={styles.below}>{props.children}</div>
      )}
    </div>
  )
}

