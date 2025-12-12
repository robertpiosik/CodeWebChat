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
  return (
    <div className={styles.container}>
      <Button on_click={on_back} is_secondary>
        Back
      </Button>
      <Button on_click={on_reject} is_danger>
        Reject
      </Button>
      <Button on_click={on_accept} disabled={is_accept_disabled}>
        Accept
      </Button>
    </div>
  )
}
