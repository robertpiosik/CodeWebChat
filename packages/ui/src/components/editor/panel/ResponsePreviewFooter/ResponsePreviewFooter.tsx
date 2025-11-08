import { Button } from '../Button'
import styles from './ResponsePreviewFooter.module.scss'

type Props = {
  on_reject: () => void
  on_accept: () => void
  is_accept_disabled: boolean
}

export const ResponsePreviewFooter: React.FC<Props> = ({
  on_reject,
  on_accept,
  is_accept_disabled
}) => {
  return (
    <div className={styles.container}>
      <Button on_click={on_reject} is_secondary>
        Reject
      </Button>
      <Button on_click={on_accept} disabled={is_accept_disabled}>
        Accept
      </Button>
    </div>
  )
}
