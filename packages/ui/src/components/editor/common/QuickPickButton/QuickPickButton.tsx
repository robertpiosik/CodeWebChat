import cn from 'classnames'
import styles from './QuickPickButton.module.scss'

export namespace QuickPickButton {
  export type Props = {
    label: React.ReactNode
    on_click: (e: React.MouseEvent<HTMLButtonElement>) => void
  }
}

export const QuickPickButton: React.FC<QuickPickButton.Props> = (props) => {
  return (
    <button className={styles.button} onClick={props.on_click}>
      <span className={styles.label}>{props.label}</span>
      <span className={cn('codicon codicon-unfold', styles.icon)} />
    </button>
  )
}
