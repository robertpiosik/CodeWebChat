import styles from './Header.module.scss'
import cn from 'classnames'

type Props<T extends string> = {
  tabs: T[]
  active_tab: T
  on_tab_click: (tab: T) => void
}

export const Header = <T extends string>(props: Props<T>) => {
  return (
    <div className={styles.container}>
      <div className={styles.tabs}>
        {props.tabs.map((tab) => (
          <button
            key={tab}
            className={cn(styles.tabs__tab, {
              [styles['tabs__tab--active']]: props.active_tab === tab
            })}
            onClick={() => props.on_tab_click(tab)}
            data-text={tab}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  )
}
