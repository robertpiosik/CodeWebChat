import cn from 'classnames'
import styles from './NavigationSection.module.scss'

type Props = {
  children: React.ReactNode
  is_active?: boolean
}

export const NavigationSection: React.FC<Props> = (props) => {
  return (
    <div
      className={cn(styles.container, {
        [styles['container--active']]: props.is_active
      })}
    >
      {props.children}
    </div>
  )
}
