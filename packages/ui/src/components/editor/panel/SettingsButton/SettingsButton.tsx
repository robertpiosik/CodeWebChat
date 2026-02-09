import styles from './SettingsButton.module.scss'
import cn from 'classnames'

export type SettingsButtonProps = {
  on_click: () => void
  label?: string
  title?: string
  show_warning_icon?: boolean
}

export const SettingsButton: React.FC<SettingsButtonProps> = (props) => {
  return (
    <button
      className={cn(styles.button, {
        [styles['button--labeled']]: !!props.label,
        [styles['button--with-warning']]: props.show_warning_icon
      })}
      onClick={props.on_click}
      title={props.title}
    >
      {props.label && <span>{props.label}</span>}
      {props.show_warning_icon && (
        <span className={styles['warning-icon']}>
          <span className={cn('codicon', 'codicon-warning')} />
        </span>
      )}
      <span className={styles['icon-wrapper']}>
        <span className={cn('codicon', 'codicon-settings-gear')} />
      </span>
    </button>
  )
}
