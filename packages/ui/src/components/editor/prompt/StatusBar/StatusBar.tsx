import React from 'react'
import cn from 'classnames'
import styles from './StatusBar.module.scss'

export type StatusBarAction = {
  id: string
  icon: string
  label?: string
  title?: string
  on_click: (e: React.MouseEvent) => void
}

export type StatusBarProps = {
  theme?: 'default' | 'warning' | 'success' | 'error'
  placement?: 'top' | 'bottom'
  icon?: string
  icon_spin?: boolean
  label: React.ReactNode
  description?: React.ReactNode
  actions?: StatusBarAction[]
  className?: string
}

export const StatusBar: React.FC<StatusBarProps> = ({
  theme = 'default',
  placement,
  icon,
  icon_spin,
  label,
  description,
  actions,
  className
}) => {
  return (
    <div
      className={cn(
        styles.container,
        styles[`theme-${theme}`],
        placement ? styles[`placement-${placement}`] : styles.rounded,
        className
      )}
    >
      <div className={styles.content}>
        {icon && (
          <span className={styles.icon}>
            <span
              className={cn('codicon', icon, {
                'codicon-modifier-spin': icon_spin
              })}
            />
          </span>
        )}
        <label className={styles.label}>{label}</label>
        {description && (
          <span className={styles.description}>{description}</span>
        )}
      </div>
      {actions && actions.length > 0 && (
        <div className={styles.actions}>
          {actions.map((action) => (
            <div
              key={action.id}
              className={styles.action}
              onClick={action.on_click}
              title={action.title}
            >
              <span className={cn('codicon', action.icon)} />
              {action.label && <span>{action.label}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
