import styles from './IconButton.module.scss'
import cn from 'classnames'

type Props = {
  codicon_icon: string
  on_click?: (e: any) => void
  href?: string
  title?: string
}

export const IconButton: React.FC<Props> = (props) => {
  if (props.href) {
    return (
      <a
        href={props.href}
        className={styles['icon-button']}
        title={props.title}
        target="_blank"
        rel="noopener noreferrer"
      >
        <span className={cn('codicon', `codicon-${props.codicon_icon}`)} />
      </a>
    )
  } else {
    return (
      <button
        className={styles['icon-button']}
        onClick={props.on_click}
        title={props.title}
      >
        <span className={cn('codicon', `codicon-${props.codicon_icon}`)} />
      </button>
    )
  }
}
