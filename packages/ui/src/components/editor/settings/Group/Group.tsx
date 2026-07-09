import styles from './Group.module.scss'
import { use_last_group_padding } from './use-last-group-padding'
import { GROUP_TITLE_HEIGHT } from '../../../../constants/sizes'

type Props = {
  children: React.ReactNode
  title?: string
  is_last?: boolean
}

export const Group: React.FC<Props> = (props) => {
  const ref = use_last_group_padding(props.is_last)

  return (
    <div ref={ref} className={props.title ? styles.wrapper : undefined}>
      {props.title && (
        <div className={styles.title} style={{ height: GROUP_TITLE_HEIGHT }}>
          {props.title}
        </div>
      )}
      <div>{props.children}</div>
    </div>
  )
}
