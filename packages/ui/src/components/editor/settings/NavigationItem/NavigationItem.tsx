import styles from './NavigationItem.module.scss'

type Props = {
  label: string
  href: string
  on_click: (e: React.MouseEvent<HTMLAnchorElement>) => void
  is_active: boolean
}

export const NavigationItem: React.FC<Props> = (props) => {
  return (
    <a href={props.href} className={styles.container} onClick={props.on_click}>
      <span>{props.label}</span>
    </a>
  )
}
