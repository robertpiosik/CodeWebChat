import cn from 'classnames'
import styles from './CompactableActionButton.module.scss'
import { Icon as UiIcon } from '../../common/Icon'

export type CompactableActionButtonProps = {
  label: string
  title?: string
  codicon?: string
  icon?: React.ComponentProps<typeof UiIcon>['variant']
  is_compact?: boolean
  disabled?: boolean
  on_click?: () => void
  href?: string
}

export const CompactableActionButton: React.FC<CompactableActionButtonProps> = (
  props
) => {
  const content = (
    <>
      <div className={styles.button__icon}>
        {props.codicon && (
          <span className={cn('codicon', `codicon-${props.codicon}`)} />
        )}
        {props.icon && <UiIcon variant={props.icon} />}
      </div>
      <span className={styles.button__text}>{props.label}</span>
    </>
  )

  const className = cn(styles.button, {
    [styles['button--compact']]: props.is_compact
  })

  if (props.href) {
    return (
      <a
        className={className}
        href={props.href}
        title={props.title || props.label}
      >
        {content}
      </a>
    )
  }

  return (
    <button
      className={className}
      onClick={props.on_click}
      title={props.title}
      disabled={props.disabled}
    >
      {content}
    </button>
  )
}
