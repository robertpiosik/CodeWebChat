import { forwardRef } from 'react'
import styles from './Tabs.module.scss'
import cn from 'classnames'

export namespace Tabs {
  export type Tab = {
    id: string
    label: string
  }
  export type Props = {
    tabs: Tab[]
    active_tab: string
    on_tab_change: (id: string) => void
    actions?: React.ReactNode
  }
}

export const Tabs = forwardRef<HTMLDivElement, Tabs.Props>((props, ref) => {
  return (
    <div ref={ref} className={styles.tabs}>
      <div className={styles.tabs__list}>
        {props.tabs.map((tab) => (
          <button
            key={tab.id}
            className={cn(styles.tabs__tab, {
              [styles['tabs__tab--active']]: tab.id == props.active_tab
            })}
            onClick={() => props.on_tab_change(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {props.actions && (
        <div className={styles.tabs__actions}>{props.actions}</div>
      )}
    </div>
  )
})
