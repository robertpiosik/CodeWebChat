import cn from 'classnames'
import styles from './QuickPickButton.module.scss'

export namespace QuickPickButton {
  export type Props = {
    label: React.ReactNode
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
  }
}

export const QuickPickButton: React.FC<QuickPickButton.Props> = (props) => {
  return (
    <button className={styles.button} onClick={props.onClick}>
      <span>{props.label}</span>
      <span className={cn('codicon codicon-unfold', styles.icon)} />
    </button>
  )
}
