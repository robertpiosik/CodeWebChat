import styles from './Home.module.scss'
import { Scrollable } from '@ui/components/editor/panel/Scrollable'
import { Enter } from '@ui/components/editor/panel/Enter'
import { HomeLinkButton } from '@ui/components/editor/panel/HomeLinkButton'
import { Donations } from '@ui/components/editor/panel/Donations'
import { Icon } from '@ui/components/editor/common/Icon'
import { use_latest_donations } from './hooks/latest-donations-hook'
import cn from 'classnames'

type Props = {
  is_active: boolean
  on_new_chat: () => void
  on_api_call: () => void
  version: string
  are_donations_visible: boolean
  on_toggle_donations_visibility: () => void
}

export const Home: React.FC<Props> = (props) => {
  const {
    donations,
    is_fetching,
    is_revalidating,
    donations_fetched_once,
    on_fetch_next_page,
    has_more
  } = use_latest_donations(props.is_active, props.are_donations_visible)

  return (
    <div className={styles.container}>
      <Scrollable>
        <div className={styles.inner}>
          <div className={styles.top}>
            <div className={styles['top__header']}>
              <div className={styles['top__header__home']}>
                <span className="codicon codicon-home" />
              </div>
              <span className={styles['top__header__text']}>Home</span>
            </div>
            <div className={styles['top__buttons']}>
              <Enter
                label="Open View: New chat"
                description="Send prompt in a free chatbot"
                on_click={props.on_new_chat}
              />
              <Enter
                label="Open View: API call"
                description="Send prompt to a model provider"
                on_click={props.on_api_call}
              />
              <HomeLinkButton
                url="https://codeweb.chat"
                background_color="black"
                fill_color="white"
                logo_icon="CODE_WEB_CHAT_LOGO"
                text_icon="CODE_WEB_CHAT_TEXT"
                label="Visit website"
              />
              <div className={styles['top__buttons__donations']}>
                <HomeLinkButton
                  url="https://buymeacoffee.com/robertpiosik"
                  background_color="#ffdd00"
                  fill_color="black"
                  text_icon="BUY_ME_A_COFFEE_TEXT"
                  logo_icon="BUY_ME_A_COFFEE_LOGO"
                  label="Support author"
                />
                <Donations
                  donations={donations}
                  is_fetching={is_fetching}
                  is_revalidating={is_revalidating}
                  are_donations_visible={props.are_donations_visible}
                  donations_fetched_once={donations_fetched_once}
                  on_toggle_donations_visibility={
                    props.on_toggle_donations_visibility
                  }
                  on_fetch_next_page={on_fetch_next_page}
                  has_more={has_more}
                />
              </div>
            </div>
          </div>

          <div className={styles.bottom}>
            <div className={styles.bottom__version}>{props.version}</div>
            <div className={styles.bottom__links}>
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

      <div className={styles.footer}>
        <div className={styles.footer__social}>
          <a
            href="https://x.com/CodeWebChat"
            title="Follow on X"
            className={cn(
              styles.footer__social__icon,
              styles['footer__social__icon--x']
            )}
          >
            <Icon variant="X" />
          </a>
          <a
            href="https://www.reddit.com/r/CodeWebChat/"
            title="Join subreddit"
            className={cn(
              styles.footer__social__icon,
              styles['footer__social__icon--reddit']
            )}
          >
            <Icon variant="REDDIT" />
          </a>
          <a
            href="https://discord.gg/KJySXsrSX5"
            title="Join Discord server"
            className={cn(
              styles.footer__social__icon,
              styles['footer__social__icon--discord']
            )}
          >
            <Icon variant="DISCORD" />
          </a>
        </div>

        <div className={styles.footer__website}>
          <a href="https://codeweb.chat/">Documentation</a>
        </div>
      </div>
    </div>
  )
}
