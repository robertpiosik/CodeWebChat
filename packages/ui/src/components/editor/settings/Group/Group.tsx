import styles from './Group.module.scss'

type Props = {
  children: React.ReactNode
  title?: string
}

export const Group: React.FC<Props> = (props) => {
  return (
    <div className={props.title ? styles.wrapper : undefined}>
      {props.title && <div className={styles.title}>{props.title}</div>}
      <div className={styles.container}>{props.children}</div>
    </div>
  )
}
