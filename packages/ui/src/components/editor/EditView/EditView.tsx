import styles from './EditView.module.scss'
import { IconButton } from '../IconButton/IconButton'

type Props = {
  on_back_click: () => void
  back_label: string
  children: React.ReactNode
}

export const EditView: React.FC<Props> = (props) => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <IconButton
          codicon_icon="arrow-left"
          on_click={props.on_back_click}
          title={props.back_label}
        />
        <span className={styles['back-label']}>{props.back_label}</span>
      </div>
      <div className={styles.content}>{props.children}</div>
    </div>
  )
}
