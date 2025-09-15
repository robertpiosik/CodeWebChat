import styles from './TextButton.module.scss'

type Props = {
  children: React.ReactNode
  disabled?: boolean
  title?: string
  on_click: () => void
}

export const TextButton: React.FC<Props> = (props) => {
  return (
    <button
      className={styles.button}
      onClick={props.on_click}
      title={props.title}
      disabled={props.disabled}
    >
      {props.children}
    </button>
  )
}
