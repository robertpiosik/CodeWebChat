import cn from 'classnames'
import styles from './NavigationItemSection.module.scss'

type Props = {
  label: string
  is_active: boolean
  has_warning?: boolean
}

export const NavigationItemSection: React.FC<Props> = (props) => {
  return (
    <div
      className={cn(styles.container, {
        [styles['container--active']]: props.is_active
      })}
    >
      <span className={styles.label}>{props.label}</span>
      {props.has_warning && (
        <div className={styles.warning}>
          <span className="codicon codicon-warning" />
        </div>
      )}
    </div>
  )
}
