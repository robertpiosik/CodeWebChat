import cn from 'classnames'
import styles from './NavigationItem.module.scss'

type Props = {
  label: string
  href: string
  on_click: (e: React.MouseEvent<HTMLAnchorElement>) => void
  is_active: boolean
  has_warning?: boolean
}

export const NavigationItem: React.FC<Props> = (props) => {
  return (
    <a
      href={props.href}
      className={cn(styles.container, {
        [styles['container--active']]: props.is_active
      })}
      onClick={props.on_click}
    >
      <span className={styles.label}>{props.label}</span>
      {props.has_warning && (
        <div className={styles.warning}>
          <span className="codicon codicon-warning" />
        </div>
      )}
    </a>
  )
}
