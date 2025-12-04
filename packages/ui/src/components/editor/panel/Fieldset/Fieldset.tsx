import cn from 'classnames'
import styles from './Fieldset.module.scss'

type Props = {
  label?: string
  children?: React.ReactNode
  is_collapsed?: boolean
  on_toggle_collapsed?: () => void
}

export const Fieldset: React.FC<Props> = ({
  label,
  children,
  is_collapsed,
  on_toggle_collapsed
}) => {
  if (is_collapsed !== undefined) {
    return (
      <div className={styles.fieldset}>
        <div
          className={styles.fieldset__header}
          onClick={on_toggle_collapsed}
          role="button"
        >
          <div className={styles.fieldset__header__left}>
            <span
              className={cn('codicon', {
                'codicon-chevron-down': !is_collapsed,
                'codicon-chevron-right': is_collapsed
              })}
            />
            <span>{label}</span>
          </div>
        </div>
        {!is_collapsed && (
          <div className={styles.fieldset__content}>{children}</div>
        )}
      </div>
    )
  }

  return (
    <div className={styles.fieldset}>
      {label && <div className={styles.fieldset__label}>{label}</div>}
      <div className={styles.fieldset__content}>{children}</div>
    </div>
  )
}
