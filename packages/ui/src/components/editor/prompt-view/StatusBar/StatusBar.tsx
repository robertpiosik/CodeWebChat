import React from 'react'
import cn from 'classnames'
import styles from './StatusBar.module.scss'
import { KeycapWrapper } from '../KeycapWrapper'

export type StatusBarAction = {
  id: string
  icon: string
  label?: string
  title?: string
  keycap?: string
  on_click: (e: React.MouseEvent) => void
}

export type Props = {
  label: string
  theme?: 'default' | 'warning' | 'success' | 'error' | 'blue' | 'purple'
  placement?: 'top' | 'bottom'
  icon?: string
  icon_spin?: boolean
  description?: React.ReactNode
  actions?: StatusBarAction[]
  className?: string
}

export const StatusBar: React.FC<Props> = (props) => {
  const theme = props.theme ?? 'default'

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
          {props.actions.map((action) => {
            const content = (
              <div
                key={action.id}
                className={styles.action}
                onClick={action.on_click}
                title={action.title}
              >
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
