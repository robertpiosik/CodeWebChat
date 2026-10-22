import { useEffect, useState } from 'react'
import { use_compacting } from '@shared/hooks'
import { Button } from '../../common/Button'
import styles from './ResponsePreviewFooter.module.scss'

type Props = {
  on_back: () => void
  on_reject: () => void
  on_accept: () => void
  is_accept_disabled: boolean
}

export const ResponsePreviewFooter: React.FC<Props> = (props) => {
  const { container_ref, compact_step } = use_compacting()
  const [is_accept_focused, set_is_accept_focused] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => {
      set_is_accept_focused(true)
    }, 500)
    return () => clearTimeout(timeout)
  }, [])

  return (
    <div className={styles.container} ref={container_ref}>
      <Button
        on_click={props.on_back}
        is_secondary
        title="Back"
        codicon={compact_step >= 1 ? 'chevron-left' : undefined}
      >
        {compact_step < 1 && <span>Back</span>}
      </Button>
      <Button
        on_click={props.on_reject}
        is_danger
        title="Reject"
        codicon={compact_step >= 2 ? 'close-small' : undefined}
      >
        {compact_step < 2 && <span>Reject</span>}
      </Button>
      <Button
        on_click={props.on_accept}
        disabled={props.is_accept_disabled}
        title="Accept"
        is_focused={is_accept_focused}
        codicon={compact_step >= 3 ? 'check' : undefined}
      >
        {compact_step < 3 && <span>Accept</span>}
      </Button>
    </div>
  )
}
