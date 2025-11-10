import { Button as UiButton } from '@ui/components/editor/panel/Button'
import styles from './EditPresetFormFooter.module.scss'

type Props = {
  on_save: () => void
}

export const EditPresetFormFooter: React.FC<Props> = ({ on_save }) => {
  return (
    <div className={styles.container}>
      <UiButton on_click={on_save}>Save</UiButton>
    </div>
  )
}
