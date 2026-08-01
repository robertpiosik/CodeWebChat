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
  const { container_ref, compact_step } = use_compacting()

  return (
    <div className={styles.container} ref={container_ref}>
      <Button
        on_click={on_back}
        is_secondary
        title="Back"
        codicon="chevron-left"
      >
        {compact_step < 1 && <span className={styles.text}>Back</span>}
      </Button>
      <Button on_click={on_reject} is_danger title="Reject" codicon="close">
        {compact_step < 2 && <span className={styles.text}>Reject</span>}
      </Button>
      <Button
        on_click={on_accept}
        disabled={is_accept_disabled}
        title="Accept"
        codicon="check"
      >
        {compact_step < 3 && <span className={styles.text}>Accept</span>}
      </Button>
    </div>
  )
}
