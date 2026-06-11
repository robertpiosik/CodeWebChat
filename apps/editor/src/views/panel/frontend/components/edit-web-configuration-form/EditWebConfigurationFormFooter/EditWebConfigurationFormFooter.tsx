import { Button as UiButton } from '@ui/components/editor/common/Button'
import styles from './EditWebConfigurationFormFooter.module.scss'

type Props = {
  on_save: () => void
}

export const EditWebConfigurationFormFooter: React.FC<Props> = ({ on_save }) => {
  return (
    <div className={styles.container}>
      <UiButton on_click={on_save}>Save</UiButton>
    </div>
  )
}
