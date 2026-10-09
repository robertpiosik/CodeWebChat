import React from 'react'
import cn from 'classnames'
import styles from './Tooltip.module.scss'

type Props = {
  message: React.ReactNode
  align?: 'left' | 'right' | 'center'
  position?: 'top' | 'bottom' | 'right'
  is_warning?: boolean
  details?: React.ReactNode
  offset?: number
}

export const Tooltip: React.FC<Props> = (params) => {
  const style = {
    ...(params.offset !== undefined
      ? { '--tooltip-offset': `${params.offset}px` }
      : {})
  } as React.CSSProperties

  return (
    <div
      className={cn(styles.tooltip, {
        [styles['tooltip--align-left']]: params.align == 'left',
        [styles['tooltip--align-right']]: params.align == 'right',
        [styles['tooltip--align-center']]:
          (params.align || 'center') == 'center',
        [styles['tooltip--position-top']]: (params.position || 'top') == 'top',
        [styles['tooltip--position-bottom']]: params.position == 'bottom',
        [styles['tooltip--position-right']]: params.position == 'right',
        [styles['tooltip--warning']]: params.is_warning
      })}
      style={Object.keys(style).length > 0 ? style : undefined}
    >
      <span>
        {params.message}
        {params.details && (
          <span className={styles.tooltip__details}>{params.details}</span>
        )}
      </span>
    </div>
  )
}
