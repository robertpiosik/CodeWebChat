import styles from './DonateButton.module.scss'
import cn from 'classnames'

export type DonateButtonProps = {
  on_click: () => void
  label: string
}

export const DonateButton: React.FC<DonateButtonProps> = (props) => {
  return (
    <button className={styles.button} onClick={props.on_click}>
      <span className={styles['icon-wrapper']}>
        <span className={cn('codicon', 'codicon-coffee')} />
      </span>
      <span>{props.label}</span>
    </button>
  )
}
