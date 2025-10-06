import classNames from 'classnames'
import styles from './NavigationItem.module.scss'

type Props = {
  codicon: string
  label: string
  href: string
  on_click: (e: React.MouseEvent<HTMLAnchorElement>) => void
  is_active: boolean
}

export const NavigationItem: React.FC<Props> = ({
  codicon,
  label,
  href,
  on_click,
  is_active
}) => {
  return (
    <a
      href={href}
      className={classNames(styles.container, { [styles.active]: is_active })}
      onClick={on_click}
    >
      <i className={classNames('codicon', `codicon-${codicon}`)}></i>
      <span>{label}</span>
    </a>
  )
}
