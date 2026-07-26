import styles from './DonateButton.module.scss'
import cn from 'classnames'

export type DonateButtonProps = {
  on_click: () => void
  label: string
}

export const DonateButton: React.FC<DonateButtonProps> = (props) => {
  return (
    <button className={styles.button} onClick={props.on_click}>
      <div className={styles.button__icon}>
        <span className={cn('codicon', 'codicon-coffee')} />
      </div>
      <span>{props.label}</span>
    </button>
  )
}
