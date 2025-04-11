import styles from './IconButton.module.scss'
import cn from 'classnames'

type Props = {
  codicon_icon: string
  on_click: () => void
  title?: string
}

export const IconButton: React.FC<Props> = (props) => {
  return (
    <button
      className={cn(
        styles['icon-button'],
        'codicon',
        `codicon-${props.codicon_icon}`
      )}
      onClick={props.on_click}
      title={props.title}
    />
  )
}
