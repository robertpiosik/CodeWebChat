import cn from 'classnames'
import { use_compacting } from '@shared/hooks'
import { Button as UiButton } from '@ui/components/editor/common/Button'
import styles from './RecentDonationsFooter.module.scss'
import { use_translation } from '../../../i18n/use-translation'

type Props = {
  on_close: () => void
}

export const RecentDonationsFooter: React.FC<Props> = (props) => {
  const { t } = use_translation()
  const { container_ref, compact_step } = use_compacting()

  return (
    <div className={styles.container} ref={container_ref}>
      <UiButton on_click={props.on_close} is_secondary>
        <span className={styles['button-content']}>
          {compact_step < 1 && t('recent-donations.close')}
          {compact_step >= 1 && (
            <span className={cn('codicon', 'codicon-chevron-left')} />
          )}
        </span>
      </UiButton>
      <UiButton
        url="https://buymeacoffee.com/robertpiosik"
        title="buymeacoffee.com/robertpiosik"
      >
        <span className={styles['button-content']}>
          {compact_step < 2 && `${t('recent-donations.buy-me-a-coffee')} ↗`}
          {compact_step >= 2 && (
            <span className={cn('codicon', 'codicon-coffee')} />
          )}
        </span>
      </UiButton>
    </div>
  )
}
