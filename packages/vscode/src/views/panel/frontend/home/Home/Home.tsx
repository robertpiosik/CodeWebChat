import styles from './Home.module.scss'
import { Scrollable } from '@ui/components/editor/Scrollable'
import { Enter } from '@ui/components/editor/Enter'
import { BuyMeACoffeeButton } from '@ui/components/editor/BuyMeACoffeeButton'
import { Donations } from '@ui/components/editor/Donations'
import { Icon } from '@ui/components/editor/Icon'
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
  const { donations, is_fetching, donations_fetched_once } =
    use_latest_donations(props.is_active, props.are_donations_visible)

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
            <div className={styles['top__enter-buttons']}>
              <Enter
                label="Open View: New chat"
                description="Send prompt with a free chatbot"
                on_click={props.on_new_chat}
              />
              <Enter
                label="Open View: API call"
                description="Send prompt with an API provider"
                on_click={props.on_api_call}
              />
              <div className={styles['top__donations']}>
                <BuyMeACoffeeButton username="robertpiosik" />
                <Donations
                  donations={donations}
                  is_fetching={is_fetching}
                  are_donations_visible={props.are_donations_visible}
                  donations_fetched_once={donations_fetched_once}
                  on_toggle_donations_visibility={
                    props.on_toggle_donations_visibility
                  }
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
