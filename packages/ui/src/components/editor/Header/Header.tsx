import { useState, useEffect } from 'react'
import { Icon } from '../Icon'
import styles from './Header.module.scss'
import cn from 'classnames'

type Props = {
  active_tab: 'chat' | 'api'
  on_chat_tab_click: () => void
  on_api_tab_click: () => void
}

export const Header: React.FC<Props> = (props) => {
  const [window_width, set_window_width] = useState(window.innerWidth)

  useEffect(() => {
    const handle_resize = () => set_window_width(window.innerWidth)
    window.addEventListener('resize', handle_resize)
    return () => window.removeEventListener('resize', handle_resize)
  }, [])

  return (
    <div className={styles.container}>
      <div className={styles.tabs}>
        <button
          className={cn(styles.tabs__tab, {
            [styles['tabs__tab--active']]: props.active_tab == 'chat'
          })}
          onClick={props.on_chat_tab_click}
          data-text={window_width >= 320 ? 'Web Chat' : 'Chat'}
        >
          {window_width >= 320 ? 'Web Chat' : 'Chat'}
        </button>
        <button
          className={cn(styles.tabs__tab, {
            [styles['tabs__tab--active']]: props.active_tab == 'api'
          })}
          onClick={props.on_api_tab_click}
          data-text={window_width >= 320 ? 'API Tools' : 'API'}
        >
          {window_width >= 320 ? 'API Tools' : 'API'}
        </button>
      </div>
      <div className={styles.right}>
        <a
          href="https://buymeacoffee.com/robertpiosik"
          className={styles.right__button}
          title="Thank you for choosing to support Gemini Coder"
        >
          <Icon variant="BUY_ME_A_COFFEE" />
        </a>
        <a
          href="https://github.com/robertpiosik/gemini-coder"
          className={styles.right__button}
          title="Open issue or discussion"
        >
          <Icon variant="GITHUB" />
        </a>
      </div>
    </div>
  )
}
