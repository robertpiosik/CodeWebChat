import styles from './IconButton.module.scss'
import cn from 'classnames'

type Props = {
  codicon_icon: string
  on_click?: (e: any) => void
  href?: string
  title?: string
  label?: string
}

export const IconButton: React.FC<Props> = (props) => {
  const icon_element = (
    <span className={styles['icon-wrapper']}>
      <span className={cn('codicon', `codicon-${props.codicon_icon}`)} />
    </span>
  )

  const label_element = props.label && <span>{props.label}</span>

  if (props.href) {
    return (
      <a
        href={props.href}
        className={cn(styles['icon-button'], {
          [styles['with-label']]: !!props.label
        })}
        title={props.title}
        target="_blank"
        rel="noopener noreferrer"
      >
        {label_element}
        {icon_element}
      </a>
    )
  } else {
    return (
      <button
        className={cn(styles['icon-button'], {
          [styles['with-label']]: !!props.label
        })}
        onClick={props.on_click}
        title={props.title}
      >
        {label_element}
        {icon_element}
      </button>
    )
  }
}
