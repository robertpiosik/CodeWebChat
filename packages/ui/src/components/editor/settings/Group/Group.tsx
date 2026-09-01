import styles from './Group.module.scss'
import { GROUP_TITLE_HEIGHT } from '../../../../constants/sizes'

type Props = {
  children: React.ReactNode
  title?: string
  notice_slot?: React.ReactNode
}

export const Group: React.FC<Props> = (props) => {
  return (
    <div
      className={props.title || props.notice_slot ? styles.wrapper : undefined}
    >
      {props.title && (
        <div className={styles.title} style={{ height: GROUP_TITLE_HEIGHT }}>
          {props.title}
        </div>
      )}
      {props.notice_slot ? (
        <div className={styles.notice}>{props.notice_slot}</div>
      ) : null}
      <div className={styles.content}>{props.children}</div>
    </div>
  )
}
