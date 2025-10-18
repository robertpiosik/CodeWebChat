import styles from './Modal.module.scss'

type Props = {
  children: React.ReactNode
}

export const Modal: React.FC<Props> = (props) => {
  return (
    <div className={styles.overlay}>
      <div className={styles.container}>{props.children}</div>
    </div>
  )
}
