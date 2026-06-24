import styles from './Field.module.scss'

type Props = {
  label: string
  html_for?: string
  info?: React.ReactNode
  action?: React.ReactNode
  children?: React.ReactNode
}

export const Field: React.FC<Props> = (props) => {
  return (
    <div className={styles.field}>
      {props.label && (
        <div className={styles.field__header}>
          <label htmlFor={props.html_for} className={styles.field__label}>
            {props.label}
          </label>
          {props.action}
        </div>
      )}
      {props.children}
      {props.info && <div className={styles.field__info}>{props.info}</div>}
    </div>
  )
}
