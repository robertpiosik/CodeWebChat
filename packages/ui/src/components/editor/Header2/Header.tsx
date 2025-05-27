import { Icon } from '../Icon'
import styles from './Header.module.scss'
import cn from 'classnames'

type Props = {
  active_tab: 'chat' | 'tools' | 'settings'
  on_chat_tab_click: () => void
  on_tools_tab_click: () => void
  on_settings_tab_click: () => void
  active_mode: 'web' | 'api'
  on_mode_switch: (mode: 'web' | 'api') => void
}

export const Header: React.FC<Props> = (props) => {
  return (
    <div className={styles.container}> 
      <div className={styles.mode}> 
        <button
          className={cn(styles.mode__option, { 
            [styles['mode__option--active']]: props.active_mode == 'web'
          })}
          onClick={() => props.on_mode_switch('web')}
        >
          Web
        </button>
        <button
          className={cn(styles.mode__option, { 
            [styles['mode__option--active']]: props.active_mode === 'api'
          })}
          onClick={() => props.on_mode_switch('api')}
        >
          API
        </button>
      </div>
      <div className={styles.right}>
        <a
          href="https://buymeacoffee.com/robertpiosik"
          className={styles.right__button}
          title="Thank you for choosing to support Code Web Chat"
        >
          <Icon variant="BUY_ME_A_COFFEE" />
        </a>
      </div>
    </div>
  )
}
