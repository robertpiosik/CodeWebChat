import styles from './ViewTypeButton.module.scss'

type Props = {
  label: string
  pre: React.ReactNode
  on_click: () => void
}

export const ViewTypeButton: React.FC<Props> = (props) => {
  return (
    <button className={styles.button} onClick={props.on_click}>
      <div className={styles['button__pre']}>{props.pre}</div>
      <div className={styles['button__label']}>{props.label}</div>
    </button>
  )
}
