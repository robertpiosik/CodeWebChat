import { TextButton as UiTextButton } from '@ui/components/editor/TextButton'
import styles from './Intro.module.scss'

type Props = {
  on_open_home_view: () => void
}

export const Intro: React.FC<Props> = (props) => {
  return (
    <div className={styles.container}>
      <UiTextButton on_click={props.on_open_home_view}>
        open home view
      </UiTextButton>
    </div>
  )
}
