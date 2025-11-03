import { useState, useEffect, useContext } from 'react'
import cn from 'classnames'
import { Icon } from '@ui/components/editor/common/Icon'
import styles from './Footer.module.scss'
import { LayoutContext } from '../../contexts/LayoutContext'

export const Footer: React.FC = () => {
  const {
    is_apply_visible,
    is_undo_visible,
    can_undo,
    has_changes_to_commit,
    on_apply_click,
    on_undo_click,
    on_commit_click,
    commit_button_enabling_trigger_count
  } = useContext(LayoutContext)

  const [is_buy_me_coffee_hovered, set_is_buy_me_coffee_hovered] =
    useState(false)
  const [is_commit_disabled_temporarily, set_is_commit_disabled_temporarily] =
    useState(false)
  const [is_apply_disabled_temporarily, set_is_apply_disabled_temporarily] =
    useState(false)

  useEffect(() => {
    set_is_commit_disabled_temporarily(false)
  }, [commit_button_enabling_trigger_count])

  useEffect(() => {
    // Timeout prevents jitter of non disabled state caused by order of updates.
    setTimeout(() => {
      set_is_apply_disabled_temporarily(false)
    }, 500)
  }, [can_undo])

  const handle_apply_click = () => {
    set_is_apply_disabled_temporarily(true)
    on_apply_click()
    setTimeout(() => set_is_apply_disabled_temporarily(false), 10000)
  }

  const handle_commit_click = () => {
    if (!has_changes_to_commit) return

    set_is_commit_disabled_temporarily(true)
    on_commit_click()
    setTimeout(() => set_is_commit_disabled_temporarily(false), 10000)
  }

  return (
    <>
      <div className={styles.footer}>
        <div>
          <a
            className={cn(
              styles['footer__icon-button'],
              styles['footer__icon-button--buy-me-a-coffee']
            )}
            href="https://buymeacoffee.com/robertpiosik"
            title="Support author"
            onMouseEnter={() => set_is_buy_me_coffee_hovered(true)}
            onMouseLeave={() => set_is_buy_me_coffee_hovered(false)}
          >
            <Icon variant="BUY_ME_A_COFFEE_LOGO" />
          </a>
          <a
            className={cn(
              styles['footer__icon-button'],
              styles['footer__icon-button--discord']
            )}
            href="https://discord.gg/KJySXsrSX5"
            title="Join our Discord server!"
          >
            <Icon variant="DISCORD" />
          </a>
        </div>

        <div>
          {is_apply_visible && (
            <button
              className={cn(
                styles['footer__action-button'],
                styles['footer__action-button--outlined']
              )}
              onClick={handle_apply_click}
              title={'Integrate copied chat response or a single code block'}
              disabled={is_apply_disabled_temporarily}
            >
              Apply
            </button>
          )}
          {is_undo_visible && (
            <button
              className={cn(
                styles['footer__action-button'],
                styles['footer__action-button--outlined']
              )}
              onClick={on_undo_click}
              title={
                'Restore saved state of the codebase after chat/API response integration'
              }
              disabled={!can_undo}
            >
              Undo
            </button>
          )}
          <button
            className={cn(
              styles['footer__action-button'],
              styles['footer__action-button--outlined']
            )}
            onClick={handle_commit_click}
            title={
              has_changes_to_commit && !is_commit_disabled_temporarily
                ? 'Commit changes'
                : 'No changes to commit'
            }
            disabled={!has_changes_to_commit || is_commit_disabled_temporarily}
          >
            Commit
          </button>
        </div>
      </div>

      {is_buy_me_coffee_hovered &&
        Array.from({ length: 5 }).map((_, i) => (
          <span
            key={i}
            className={styles.footer__heart}
            style={
              {
                left: `${18 + (Math.random() - 0.5) * 20}px`,
                animationDelay: `${i == 0 ? 0 : (i + Math.random()) / 3}s`,
                animationDuration: `${2 - Math.random()}s`,
                fontSize: `${10 + Math.random() * 8}px`
              } as React.CSSProperties
            }
          >
            ❤️
          </span>
        ))}
    </>
  )
}
