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
        [styles['container--active']]: props.is_active,
        [styles['container--warning']]: props.has_warning
      })}
      onClick={props.on_click}
    >
      {props.has_warning && <span className="codicon codicon-warning" />}
      <span>{props.label}</span>
    </a>
  )
}
