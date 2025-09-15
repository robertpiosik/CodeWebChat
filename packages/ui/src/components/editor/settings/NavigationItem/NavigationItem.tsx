import classNames from 'classnames'
import styles from './NavigationItem.module.scss'

type Props = {
  codicon: string
  label: string
  on_click: () => void
  is_active: boolean
}

export const NavigationItem: React.FC<Props> = ({
  codicon,
  label,
  on_click,
  is_active
}) => {
  return (
    <button
      className={classNames(styles.container, { [styles.active]: is_active })}
      onClick={on_click}
    >
      <i className={classNames('codicon', `codicon-${codicon}`)}></i>
      <span>{label}</span>
    </button>
  )
}
