import { useState, useEffect, useContext, useRef, useLayoutEffect } from 'react'
import cn from 'classnames'
import { Icon } from '@ui/components/editor/common/Icon'
import styles from './Footer.module.scss'
import { use_compacting } from '@shared/hooks'
import { LayoutContext } from '../../../contexts/LayoutContext'

type Props = {
  on_donate_click: () => void
}

export const Footer: React.FC<Props> = (props) => {
  const {
    can_undo,
    has_changes_to_commit,
    on_apply_click,
    on_undo_click,
    on_commit_click,
    commit_button_enabling_trigger_count,
    apply_button_enabling_trigger_count
  } = useContext(LayoutContext)

  const [is_commit_disabled_temporarily, set_is_commit_disabled_temporarily] =
    useState(false)
  const [is_apply_disabled_temporarily, set_is_apply_disabled_temporarily] =
    useState(false)

  const { container_ref, compact_step, report_width } = use_compacting(4)
  const left_ref = useRef<HTMLDivElement>(null)
  const right_ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (left_ref.current && right_ref.current) {
      const width =
        left_ref.current.offsetWidth + right_ref.current.offsetWidth + 6
      report_width(width, compact_step)
    }
  }, [compact_step, report_width])

  useEffect(() => {
    set_is_commit_disabled_temporarily(false)
  }, [commit_button_enabling_trigger_count])

  useEffect(() => {
    set_is_apply_disabled_temporarily(false)
  }, [apply_button_enabling_trigger_count])

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
      <div className={styles.footer} ref={container_ref}>
        <div ref={left_ref}>
          <a
            className={cn(
              styles['footer__icon-button'],
              styles['footer__icon-button--buy-me-a-coffee']
            )}
            href="#"
            onClick={(e) => {
              e.preventDefault()
              props.on_donate_click()
            }}
            title="Donate"
          >
            <Icon variant="BUY_ME_A_COFFEE_LOGO" />
          </a>
          <a
            className={cn(
              styles['footer__icon-button'],
              styles['footer__icon-button--reddit']
            )}
            href="https://www.reddit.com/r/CodeWebChat/"
            title="Reddit"
          >
            <Icon variant="REDDIT" />
          </a>
          <a
            className={cn(
              styles['footer__icon-button'],
              styles['footer__icon-button--discord']
            )}
            href="https://discord.gg/KJySXsrSX5"
            title="Get involved"
          >
            <Icon variant="DISCORD" />
          </a>
        </div>

        <div ref={right_ref}>
          <button
            className={cn(styles['footer__action-button'], {
              [styles['footer__action-button--compact']]: compact_step >= 4
            })}
            onClick={handle_apply_click}
            title={'Integrate copied chat response or a single code block'}
            disabled={is_apply_disabled_temporarily}
          >
            <span className={styles['footer__action-button__text']}>
              {compact_step == 0 ? 'Apply from Clipboard' : 'Apply'}
            </span>
            <span
              className={cn(
                styles['footer__action-button__icon'],
                'codicon',
                'codicon-check'
              )}
            />
          </button>
          <button
            className={cn(styles['footer__action-button'], {
              [styles['footer__action-button--compact']]: compact_step >= 3
            })}
            onClick={on_undo_click}
            title={
              'Restore saved state of the codebase after chat/API response integration'
            }
            disabled={!can_undo}
          >
            <span className={styles['footer__action-button__text']}>Undo</span>
            <span
              className={cn(
                styles['footer__action-button__icon'],
                'codicon',
                'codicon-redo'
              )}
            />
          </button>
          <button
            className={cn(styles['footer__action-button'], {
              [styles['footer__action-button--compact']]: compact_step >= 2
            })}
            onClick={handle_commit_click}
            title={
              has_changes_to_commit && !is_commit_disabled_temporarily
                ? 'Commit changes'
                : 'No changes to commit'
            }
            disabled={!has_changes_to_commit || is_commit_disabled_temporarily}
          >
            <span className={styles['footer__action-button__text']}>
              Commit
            </span>
            <span
              className={cn(
                styles['footer__action-button__icon'],
                'codicon',
                'codicon-git-commit'
              )}
            />
          </button>
        </div>
      </div>
    </>
  )
}
