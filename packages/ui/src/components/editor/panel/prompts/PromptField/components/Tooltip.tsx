import React from 'react'
import cn from 'classnames'
import styles from './Tooltip.module.scss'

export type TooltipProps = {
  message: React.ReactNode
  align: 'left' | 'right' | 'center'
  is_warning?: boolean
  details?: React.ReactNode
  offset?: number
}

export const Tooltip: React.FC<TooltipProps> = (params) => (
  <div
    className={cn(styles.tooltip, {
      [styles['tooltip--align-left']]: params.align == 'left',
      [styles['tooltip--align-right']]: params.align == 'right',
      [styles['tooltip--align-center']]: params.align == 'center',
      [styles['tooltip--warning']]: params.is_warning
    })}
    style={
      params.offset !== undefined
        ? ({ '--tooltip-offset': `${params.offset}px` } as React.CSSProperties)
        : undefined
    }
  >
    {params.message}
    {params.details && (
      <span className={styles.tooltip__details}>{params.details}</span>
    )}
  </div>
)
