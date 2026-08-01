import cn from 'classnames'
import styles from './Fieldset.module.scss'

type Props = {
  label?: string
  children?: React.ReactNode
  is_collapsed?: boolean
  on_toggle_collapsed?: () => void
}

export const Fieldset: React.FC<Props> = (props) => {
  if (props.is_collapsed !== undefined) {
    return (
      <div className={styles.fieldset}>
        <div
          className={cn(
            styles.fieldset__label,
            styles['fieldset__label--interactive']
          )}
          onClick={props.on_toggle_collapsed}
          role="button"
        >
          <span className={styles['fieldset__label__text']}>{props.label}</span>
          <span
            className={cn('codicon', {
              'codicon-chevron-down': !props.is_collapsed,
              'codicon-chevron-right': props.is_collapsed
            })}
          />
        </div>
        {!props.is_collapsed && (
          <div className={styles.fieldset__content}>{props.children}</div>
        )}
      </div>
    )
  }

  return (
    <div className={styles.fieldset}>
      {props.label && (
        <div className={styles.fieldset__label}>{props.label}</div>
      )}
      <div className={styles.fieldset__content}>{props.children}</div>
    </div>
  )
}
