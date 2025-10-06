import styles from './Home.module.scss'
import { Scrollable } from '@ui/components/editor/Scrollable'
import { Enter } from '@ui/components/editor/Enter'
import { HomeLinkButton } from '@ui/components/editor/HomeLinkButton'
import { Donations } from '@ui/components/editor/Donations'
import { Icon } from '@ui/components/editor/Icon'
import { use_latest_donations } from './hooks/latest-donations-hook'
import cn from 'classnames'
import { dictionary } from '@shared/constants/dictionary'

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
              <span className={styles['top__header__text']}>
                {dictionary.home.header}
              </span>
            </div>
            <div className={styles['top__buttons']}>
              <Enter
                label={dictionary.home.new_chat_label}
                description={dictionary.home.new_chat_description}
                on_click={props.on_new_chat}
              />
              <Enter
                label={dictionary.home.api_call_label}
                description={dictionary.home.api_call_description}
                on_click={props.on_api_call}
              />
              <HomeLinkButton
                url="https://codeweb.chat"
                background_color="black"
                fill_color="white"
                logo_icon="CODE_WEB_CHAT_LOGO"
                text_icon="CODE_WEB_CHAT_TEXT"
                label={dictionary.home.visit_website_label}
                title={dictionary.home.visit_website}
              />
              <div className={styles['top__buttons__donations']}>
                <HomeLinkButton
                  url="https://buymeacoffee.com/robertpiosik"
                  background_color="#ffdd00"
                  fill_color="black"
                  text_icon="BUY_ME_A_COFFEE_TEXT"
                  logo_icon="BUY_ME_A_COFFEE_LOGO"
                  label={dictionary.home.support_author_label}
                  title={dictionary.home.support_author}
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
                {dictionary.home.license_prefix}{' '}
                <a href="https://github.com/robertpiosik/CodeWebChat/blob/dev/LICENSE">
                  {dictionary.home.license_link_text}
                </a>
              </div>
              <div>
                Copyright © {new Date().getFullYear()}{' '}
                <a href="https://x.com/robertpiosik">
                  {dictionary.home.author}
                </a>
              </div>
            </div>
          </div>
        </div>
      </Scrollable>

      <div className={styles.footer}>
        <div className={styles.footer__social}>
          <a
            href="https://x.com/CodeWebChat"
            title={dictionary.home.follow_x}
            className={cn(
              styles.footer__social__icon,
              styles['footer__social__icon--x']
            )}
          >
            <Icon variant="X" />
          </a>
          <a
            href="https://www.reddit.com/r/CodeWebChat/"
            title={dictionary.home.join_reddit}
            className={cn(
              styles.footer__social__icon,
              styles['footer__social__icon--reddit']
            )}
          >
            <Icon variant="REDDIT" />
          </a>
          <a
            href="https://discord.gg/KJySXsrSX5"
            title={dictionary.home.join_discord}
            className={cn(
              styles.footer__social__icon,
              styles['footer__social__icon--discord']
            )}
          >
            <Icon variant="DISCORD" />
          </a>
        </div>

        <div className={styles.footer__website}>
          <a href="https://codeweb.chat/">{dictionary.home.documentation}</a>
        </div>
      </div>
    </div>
  )
}
