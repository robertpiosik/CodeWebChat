import styles from './Notice.module.scss'
import React from 'react'
import cn from 'classnames'

type Props = {
  children: React.ReactNode
  type: 'info' | 'warning'
}

export const Notice: React.FC<Props> = ({ children, type }) => {
  return (
    <div
      className={cn(styles.container, {
        [styles['container--info']]: type === 'info',
        [styles['container--warning']]: type === 'warning'
      })}
    >
      <span
        className={cn(
          'codicon',
          type === 'info' ? 'codicon-info' : 'codicon-warning'
        )}
      />
      <span>{children}</span>
    </div>
  )
}
