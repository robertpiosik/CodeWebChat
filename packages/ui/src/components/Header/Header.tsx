import styles from './Header.module.scss'
import cn from 'classnames'

type Props = {
  active_tab: 'chat' | 'api'
  on_chat_tab_click: () => void
  on_api_tab_click: () => void
}

export const Header: React.FC<Props> = (props) => {
  return (
    <div className={styles.container}>
      <div className={styles.tabs}>
        <button
          className={cn(styles.tabs__tab, {
            [styles['tab--active']]: props.active_tab == 'chat'
          })}
          onClick={props.on_chat_tab_click}
        >
          Chat
        </button>
        <button
          className={cn(styles.tabs__tab, {
            [styles['tab--active']]: props.active_tab == 'api'
          })}
          onClick={props.on_api_tab_click}
        >
          API
        </button>
      </div>
      <div className={styles.right}>TODO</div>
    </div>
  )
}
