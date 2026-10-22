import React, { useState } from 'react'
import cn from 'classnames'
import styles from './StatusBar.module.scss'
import { KeycapWrapper } from '../KeycapWrapper'
import { Tooltip } from '../../common/Tooltip'

export type StatusBarAction = {
  id: string
  icon: string
  label?: string
  title?: string
  tooltip?: string
  tooltip_align?: 'left' | 'center' | 'right'
  keycap?: string
  on_click: (e: React.MouseEvent) => void
}

export type Props = {
  label: string
  theme?: 'default' | 'warning' | 'success' | 'error' | 'blue' | 'purple'
  placement?: 'top' | 'bottom' | 'in-between'
  icon?: string
  icon_spin?: boolean
  description?: React.ReactNode
  actions?: StatusBarAction[]
  className?: string
}

export const StatusBar: React.FC<Props> = (props) => {
  const theme = props.theme ?? 'default'
  const [hovered_action, set_hovered_action] = useState<string | null>(null)

  return (
    <div
      className={cn(
        styles.container,
        styles[`theme-${theme}`],
        props.placement
          ? styles[`placement-${props.placement}`]
          : styles.rounded,
        props.className
      )}
    >
      <div className={styles.content}>
        {props.icon && (
          <span className={styles.icon}>
            <span
              className={cn('codicon', props.icon, {
                'codicon-modifier-spin': props.icon_spin
              })}
            />
          </span>
        )}
        <label className={styles.label}>{props.label}</label>
        {props.description && (
          <span className={styles.description}>{props.description}</span>
        )}
      </div>
      {props.actions && props.actions.length > 0 && (
        <div className={styles.actions}>
          {props.actions.map((action, index) => {
            const is_last = index === props.actions!.length - 1
            const has_label = !!action.label

            const content = (
              <div
                key={action.id}
                className={cn(styles.action, {
                  [styles.last]: is_last,
                  [styles['no-label']]: !has_label
                })}
                onClick={action.on_click}
                title={action.title}
                onMouseEnter={() => set_hovered_action(action.id)}
                onMouseLeave={() => set_hovered_action(null)}
              >
                {hovered_action === action.id && action.tooltip && (
                  <Tooltip
                    message={action.tooltip}
                    position="top"
                    align={action.tooltip_align || 'center'}
                    offset={6}
                    translate={{ y: -7 }}
                  />
                )}
                <span className={cn('codicon', action.icon)} />
                {action.label && <span>{action.label}</span>}
              </div>
            )

            if (action.keycap) {
              return (
                <KeycapWrapper key={action.id} char={action.keycap}>
                  {content}
                </KeycapWrapper>
              )
            }

            return content
          })}
        </div>
      )}
    </div>
  )
}
