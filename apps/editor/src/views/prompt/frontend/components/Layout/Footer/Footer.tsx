import { useState, useEffect, useContext } from 'react'
import styles from './Footer.module.scss'
import { use_compacting } from '@shared/hooks'
import { LayoutContext } from '../../../contexts/LayoutContext'
import { use_translation } from '../../../i18n/use-translation'
import { CompactableActionButton } from '@ui/components/editor/prompt/CompactableActionButton'

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

  const [is_apply_disabled_temporarily, set_is_apply_disabled_temporarily] =
    useState(false)

  const { container_ref, compact_step } = use_compacting()

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
    <div className={styles.footer} ref={container_ref}>
      <div className={styles.footer__left}>
        <CompactableActionButton
          is_compact={compact_step >= 2}
          on_click={props.on_history_click}
          title={t('footer.history-title')}
          codicon="history"
          label={history_label}
        />
        <CompactableActionButton
          is_compact={compact_step >= 1}
          on_click={on_undo_click}
          title={t('footer.undo-title')}
          disabled={!can_undo}
          codicon="discard"
          label={undo_label}
        />
      </div>

      <div>
        <CompactableActionButton
          is_compact={compact_step >= 3}
          on_click={handle_apply_click}
          title={t('footer.apply-title')}
          disabled={is_apply_disabled_temporarily}
          codicon="clippy"
          label={apply_label}
        />
      </div>
    </div>
  )
}
