import { useState, useEffect, useContext, useRef, useLayoutEffect } from 'react'
import styles from './Footer.module.scss'
import { use_compacting, use_compact_order } from '@shared/hooks'
import { LayoutContext } from '../../../contexts/LayoutContext'
import { use_translation } from '../../../i18n/use-translation'
import { CompactableActionButton } from '@ui/components/editor/panel/CompactableActionButton'

type Props = {
  on_history_click?: () => void
}

export const Footer: React.FC<Props> = (props) => {
  const {
    can_undo,
    on_apply_click,
    on_undo_click,
    apply_button_enabling_trigger_count
  } = useContext(LayoutContext)

  const { t } = use_translation()

  const history_label = t('footer.action.history')
  const undo_label = t('footer.action.undo')
  const apply_label = t('footer.action.apply-from-clipboard')

  const compact_order = use_compact_order([
    history_label,
    undo_label,
    apply_label
  ])

  const [is_apply_disabled_temporarily, set_is_apply_disabled_temporarily] =
    useState(false)

  const { container_ref, compact_step, report_width } = use_compacting(3)
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
          <CompactableActionButton
            is_compact={compact_step >= compact_order[0]}
            on_click={props.on_history_click}
            title={t('footer.history-title')}
            codicon="history"
            label={history_label}
          />
          <CompactableActionButton
            is_compact={compact_step >= compact_order[1]}
            on_click={on_undo_click}
            title={t('footer.undo-title')}
            disabled={!can_undo}
            codicon="discard"
            label={undo_label}
          />
        </div>

        <div ref={right_ref}>
          <CompactableActionButton
            is_compact={compact_step >= compact_order[2]}
            on_click={handle_apply_click}
            title={t('footer.apply-title')}
            disabled={is_apply_disabled_temporarily}
            codicon="clippy"
            label={apply_label}
          />
        </div>
      </div>
    </>
  )
}
