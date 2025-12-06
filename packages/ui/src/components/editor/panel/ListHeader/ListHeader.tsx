import styles from './ListHeader.module.scss'
import cn from 'classnames'

export namespace ListHeader {
  export type Props = {
    title: string
    is_collapsed: boolean
    on_toggle_collapsed: () => void
    actions?: React.ReactNode
  }
}

export const ListHeader: React.FC<ListHeader.Props> = (props) => {
  return (
    <div
      className={styles.header}
      onClick={props.on_toggle_collapsed}
      role="button"
    >
      <div className={styles.header__left}>
        <span
          className={cn('codicon', {
            'codicon-chevron-down': !props.is_collapsed,
            'codicon-chevron-right': props.is_collapsed
          })}
        />
        <span>{props.title}</span>
      </div>
      {props.actions && !props.is_collapsed && (
        <div className={styles.header__right}>{props.actions}</div>
      )}
    </div>
  )
}
