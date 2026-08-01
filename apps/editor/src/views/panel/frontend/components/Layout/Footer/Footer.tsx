import { useState, useEffect, useContext, useRef, useLayoutEffect } from 'react'
import cn from 'classnames'
import { Icon as UiIcon } from '@ui/components/editor/common/Icon'
import styles from './Footer.module.scss'
import { use_compacting } from '@shared/hooks'
import { LayoutContext } from '../../../contexts/LayoutContext'
import { use_translation } from '../../../i18n/use-translation'

export const Footer: React.FC = () => {
  const {
    can_undo,
    on_apply_click,
    on_undo_click,
    apply_button_enabling_trigger_count
  } = useContext(LayoutContext)

  const { t } = use_translation()

  const [is_apply_disabled_temporarily, set_is_apply_disabled_temporarily] =
    useState(false)

  const { container_ref, compact_step, report_width } = use_compacting(2)
  const left_ref = useRef<HTMLDivElement>(null)
  const right_ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (left_ref.current && right_ref.current) {
      const width =
        left_ref.current.getBoundingClientRect().width +
        right_ref.current.getBoundingClientRect().width +
        6
      report_width(width, compact_step)
    }
  }, [compact_step, report_width])

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

  return (
    <>
      <div className={styles.footer} ref={container_ref}>
        <div ref={left_ref} className={styles.footer__left}>
          <a
            className={cn(
              styles['footer__icon-button'],
              styles['footer__icon-button--discord']
            )}
            href="https://discord.gg/KJySXsrSX5"
            title={t('footer.get-involved')}
          >
            <UiIcon variant="DISCORD" />
          </a>
        </div>

        <div ref={right_ref}>
          <button
            className={cn(styles['footer__action-button'], {
              [styles['footer__action-button--compact']]: compact_step >= 1
            })}
            onClick={on_undo_click}
            title={t('footer.undo-title')}
            disabled={!can_undo}
          >
            <span
              className={cn(
                styles['footer__action-button__icon'],
                'codicon',
                'codicon-discard'
              )}
            />
            <span className={styles['footer__action-button__text']}>
              {t('footer.action.undo')}
            </span>
          </button>
          <button
            className={cn(styles['footer__action-button'], {
              [styles['footer__action-button--compact']]: compact_step >= 2
            })}
            onClick={handle_apply_click}
            title={t('footer.apply-title')}
            disabled={is_apply_disabled_temporarily}
          >
            <span
              className={cn(
                styles['footer__action-button__icon'],
                'codicon',
                'codicon-clippy'
              )}
            />
            <span className={styles['footer__action-button__text']}>
              {t('footer.action.apply-from-clipboard')}
            </span>
          </button>
        </div>
      </div>
    </>
  )
}
