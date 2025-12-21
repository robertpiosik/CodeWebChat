import { useRef, useLayoutEffect } from 'react'
import cn from 'classnames'
import { use_compacting } from '@shared/hooks'
import { Button } from '../../common/Button'
import styles from './ResponsePreviewFooter.module.scss'

type Props = {
  on_back: () => void
  on_reject: () => void
  on_accept: () => void
  is_accept_disabled: boolean
}

export const ResponsePreviewFooter: React.FC<Props> = ({
  on_back,
  on_reject,
  on_accept,
  is_accept_disabled
}) => {
  const { container_ref, compact_step, report_width } = use_compacting(3)
  const back_ref = useRef<HTMLSpanElement>(null)
  const reject_ref = useRef<HTMLSpanElement>(null)
  const accept_ref = useRef<HTMLSpanElement>(null)

  useLayoutEffect(() => {
    if (back_ref.current && reject_ref.current && accept_ref.current) {
      // Padding (approx 24px per button) + gap (8px * 2)
      const padding_and_gap = 3 * 24 + 2 * 8
      const width =
        back_ref.current.offsetWidth +
        reject_ref.current.offsetWidth +
        accept_ref.current.offsetWidth +
        padding_and_gap
      report_width(width, compact_step)
    }
  }, [compact_step, report_width])

  return (
    <div className={styles.container} ref={container_ref}>
      <Button on_click={on_back} is_secondary title="Back">
        <span className={styles['button-content']} ref={back_ref}>
          {compact_step < 1 && <span className={styles.text}>Back</span>}
          {compact_step >= 1 && (
            <span className={cn('codicon', 'codicon-chevron-left')} />
          )}
        </span>
      </Button>
      <Button on_click={on_reject} is_danger title="Reject">
        <span className={styles['button-content']} ref={reject_ref}>
          {compact_step < 2 && <span className={styles.text}>Reject</span>}
          {compact_step >= 2 && (
            <span className={cn('codicon', 'codicon-close')} />
          )}
        </span>
      </Button>
      <Button on_click={on_accept} disabled={is_accept_disabled} title="Accept">
        <span className={styles['button-content']} ref={accept_ref}>
          {compact_step < 3 && <span className={styles.text}>Accept</span>}
          {compact_step >= 3 && (
            <span className={cn('codicon', 'codicon-check')} />
          )}
        </span>
      </Button>
    </div>
  )
}
