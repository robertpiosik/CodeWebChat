import { Button as UiButton } from '@ui/components/editor/common/Button'
import styles from './DonationsFooter.module.scss'

type Props = {
  on_close: () => void
}

export const DonationsFooter: React.FC<Props> = (props) => {
  return (
    <div className={styles.container}>
      <UiButton on_click={props.on_close} is_secondary>
        Close
      </UiButton>
      <UiButton
        url="https://buymeacoffee.com/robertpiosik"
        title="https://buymeacoffee.com/robertpiosik"
      >
        Donate ↗
      </UiButton>
    </div>
  )
}
