import styles from './Group.module.scss'

type Props = {
  children: React.ReactNode
  title?: string
  notices_slot?: React.ReactNode
}

export const Group: React.FC<Props> = (props) => {
  return (
    <div
      className={props.title || props.notices_slot ? styles.wrapper : undefined}
    >
      {props.title && <div className={styles.title}>{props.title}</div>}
      {props.notices_slot && (
        <div className={styles.notices}>{props.notices_slot}</div>
      )}
      <div>{props.children}</div>
    </div>
  )
}
