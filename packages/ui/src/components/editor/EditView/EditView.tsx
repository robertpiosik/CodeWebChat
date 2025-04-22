import styles from './EditView.module.scss'
import { IconButton } from '../IconButton/IconButton'

type Props = {
  on_back_click: () => void
  children: React.ReactNode
}

export const EditView: React.FC<Props> = (props) => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <IconButton
          codicon_icon="chevron-left"
          on_click={props.on_back_click}
          title="Return to previous screen"
        />
        <span className={styles['back-label']}>Back</span>
      </div>
      <div className={styles.content}>{props.children}</div>
    </div>
  )
}
