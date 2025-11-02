import { Button } from '../Button'
import styles from './ResponsePreviewFooter.module.scss'

type Props = {
  on_discard: () => void
  on_approve: () => void
  is_approve_disabled: boolean
}

export const ResponsePreviewFooter: React.FC<Props> = ({
  on_discard,
  on_approve,
  is_approve_disabled
}) => {
  return (
    <div className={styles.container}>
      <Button on_click={on_discard} is_secondary>
        Discard
      </Button>
      <Button on_click={on_approve} disabled={is_approve_disabled}>
        Approve
      </Button>
    </div>
  )
}
