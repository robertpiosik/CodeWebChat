import styles from './Header.module.scss'
import cn from 'classnames'

type Props = {
  active_tab: 'chat' | 'settings' | 'donations'
  on_chat_tab_click: () => void
  on_donate_tab_click: () => void
  on_settings_tab_click: () => void
}

export const Header: React.FC<Props> = (props) => {
  return (
    <div className={styles.container}>
      <div className={styles.tabs}>
        <button
          className={cn(styles.tabs__tab, {
            [styles['tabs__tab--active']]: props.active_tab == 'chat'
          })}
          onClick={props.on_chat_tab_click}
          data-text="Chat"
        >
          Chat
        </button>
        <button
          className={cn(styles.tabs__tab, {
            [styles['tabs__tab--active']]: props.active_tab == 'settings'
          })}
          onClick={props.on_settings_tab_click}
          data-text="Settings"
        >
          Settings
        </button>
        <button
          className={cn(styles.tabs__tab, {
            [styles['tabs__tab--active']]: props.active_tab == 'donations'
          })}
          onClick={props.on_donate_tab_click}
          data-text="Donations"
        >
          Donations
        </button>
      </div>
    </div>
  )
}
