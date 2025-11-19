import styles from './Home.module.scss'
import { Scrollable } from '@ui/components/editor/panel/Scrollable'
import { ViewTypeButton } from '@ui/components/editor/panel/ViewTypeButton'
import { HomeLinkButton } from '@ui/components/editor/panel/HomeLinkButton'
import cn from 'classnames'
import { post_message } from '../utils/post_message'
import { FrontendMessage } from '@/views/panel/types/messages'

type Props = {
  vscode: any
  is_active: boolean
  on_chatbots_click: () => void
  on_api_calls_click: () => void
  version: string
}

export const Home: React.FC<Props> = (props) => {
  const handle_settings_click = () => {
    post_message(props.vscode, {
      command: 'EXECUTE_COMMAND',
      command_id: 'codeWebChat.settings'
    } as FrontendMessage)
  }

  return (
    <>
      <div className={styles.header}>
        <div className={styles['header__left']}>
          <div className={styles['header__home']}>
            <span className="codicon codicon-home" />
          </div>
          <span className={styles['header__text']}>Home</span>
        </div>
        <button
          className={styles['header__settings']}
          onClick={handle_settings_click}
          title="Settings"
        >
          <span>Settings</span>
          <span className={styles['header__settings__icon-wrapper']}>
            <span className={cn('codicon', 'codicon-settings-gear')} />
          </span>
        </button>
      </div>

      <Scrollable>
        <div className={styles.content}>
          <div className={styles.inner}>
            {/* view type */}
            <div className={styles['inner__view-type']}>
              <ViewTypeButton
                pre="Initialize"
                label="Chatbots"
                on_click={props.on_chatbots_click}
              />
              <ViewTypeButton
                pre="Make"
                label="API calls"
                on_click={props.on_api_calls_click}
              />
            </div>
            <div className={styles['inner__buttons']}>
              <HomeLinkButton
                url="https://codeweb.chat"
                background_color="black"
                fill_color="white"
                logo_icon="CODE_WEB_CHAT_LOGO"
                text_icon="CODE_WEB_CHAT_TEXT"
                label="Visit website"
              />
              <HomeLinkButton
                url="https://coindrop.to/cwc"
                background_color="#ffdd00"
                fill_color="black"
                text_icon="BUY_ME_A_COFFEE_TEXT"
                logo_icon="BUY_ME_A_COFFEE_LOGO"
                label="Donate"
              />
              <HomeLinkButton
                url="https://discord.gg/KJySXsrSX5"
                background_color="#5765f2"
                fill_color="white"
                logo_icon="DISCORD_LOGO"
                text_icon="DISCORD_TEXT"
                label="Get involved"
              />
            </div>
          </div>

          <div className={styles.bottom}>
            <div className={styles.bottom__links}>
              <div>{props.version}</div>
              <div>
                Released under the{' '}
                <a href="https://github.com/robertpiosik/CodeWebChat/blob/dev/LICENSE">
                  GPL-3.0 license
                </a>
              </div>
              <div>
                Copyright © {new Date().getFullYear()}{' '}
                <a href="https://x.com/robertpiosik">Robert Piosik</a>
              </div>
            </div>
          </div>
        </div>
      </Scrollable>
    </>
  )
}
