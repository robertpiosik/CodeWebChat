import { useRef, useLayoutEffect } from 'react'
import cn from 'classnames'
import { use_compacting } from '@shared/hooks'
import { Button as UiButton } from '@ui/components/editor/common/Button'
import styles from './DonationsFooter.module.scss'

type Props = {
  on_close: () => void
}

export const DonationsFooter: React.FC<Props> = (props) => {
  const { container_ref, compact_step, report_width } = use_compacting(2)
  const close_ref = useRef<HTMLSpanElement>(null)
  const coffee_ref = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    if (close_ref.current && coffee_ref.current) {
      const padding_and_gap = 2 * 24 + 8
      const width =
        close_ref.current.getBoundingClientRect().width +
        coffee_ref.current.getBoundingClientRect().width +
        padding_and_gap
      report_width(width, compact_step)
    }
  }, [compact_step, report_width])

  return (
    <div className={styles.container} ref={container_ref}>
      <UiButton on_click={props.on_close} is_secondary>
        <span className={styles['button-content']} ref={close_ref}>
          {compact_step < 1 && 'Close'}
          {compact_step >= 1 && (
            <span className={cn('codicon', 'codicon-chevron-left')} />
          )}
        </span>
      </UiButton>
      <UiButton
        url="https://buymeacoffee.com/robertpiosik"
        title="buymeacoffee.com/robertpiosik"
      >
        <span className={styles['button-content']} ref={coffee_ref}>
          {compact_step < 2 && 'Buy Me A Coffee ↗'}
          {compact_step >= 2 && (
            <span className={cn('codicon', 'codicon-coffee')} />
          )}
        </span>
      </UiButton>
    </div>
  )
}
