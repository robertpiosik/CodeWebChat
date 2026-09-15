import cn from 'classnames'
import styles from './Group.module.scss'
import { GROUP_TITLE_HEIGHT } from '../../../../constants/sizes'

type Props = {
  children: React.ReactNode
  title?: string
  notice_slot?: React.ReactNode
  is_disabled?: boolean
}

export const Group: React.FC<Props> = (props) => {
  return (
    <div
      className={cn({
        [styles.wrapper]: props.title || props.notice_slot || props.is_disabled,
        [styles['wrapper--disabled']]: props.is_disabled
      })}
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
