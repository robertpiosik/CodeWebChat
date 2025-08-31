import styles from './Intro.module.scss'
import { Scrollable } from '@ui/components/editor/Scrollable'
import { Enter } from '@ui/components/editor/Enter'
import { BuyMeACoffee } from '@ui/components/editor/BuyMeACoffee'
import { Icon } from '@ui/components/editor/Icon'
import cn from 'classnames'

type Donation = {
  supporter_name: string
  support_coffees: number
  support_note: string
}

type Props = {
  on_new_chat: () => void
  on_api_call: () => void
  version: string
  latest_donation: Donation | null
}

export const Intro: React.FC<Props> = (props) => {
  return (
    <div className={styles.container}>
      <Scrollable>
        <div className={styles.inner}>
          <div className={styles.top}>
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
              <BuyMeACoffee
                username="robertpiosik"
                supporter_name={props.latest_donation?.supporter_name}
                support_coffees={props.latest_donation?.support_coffees}
                support_note={props.latest_donation?.support_note}
              />
            </div>
          </div>
          <div className={styles.bottom}>
            <div className={styles.bottom__version}>{props.version}</div>
            <div className={styles.bottom__social}>
              <a
                href="https://x.com/CodeWebChat"
                title="Follow on X"
                className={cn(
                  styles.bottom__social__icon,
                  styles['bottom__social__icon--x']
                )}
              >
                <Icon variant="X" />
              </a>
              <a
                href="https://www.reddit.com/r/CodeWebChat/"
                title="Join subreddit"
                className={cn(
                  styles.bottom__social__icon,
                  styles['bottom__social__icon--reddit']
                )}
              >
                <Icon variant="REDDIT" />
              </a>
              <a
                href="https://discord.gg/KJySXsrSX5"
                title="Join Discord server"
                className={cn(
                  styles.bottom__social__icon,
                  styles['bottom__social__icon--discord']
                )}
              >
                <Icon variant="DISCORD" />
              </a>
            </div>
            <div className={styles.bottom__links}>
              <a href="https://codeweb.chat/">https://codeweb.chat</a>
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
    </div>
  )
}
