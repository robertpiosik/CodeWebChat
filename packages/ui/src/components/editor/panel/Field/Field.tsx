import styles from './Field.module.scss'

type Props = {
  label: string
  html_for?: string
  info?: React.ReactNode
  children?: React.ReactNode
  title?: string
}

export const Field: React.FC<Props> = (props) => {
  return (
    <div className={styles.field} title={props.title}>
      <label htmlFor={props.html_for} className={styles.field__label}>
        {props.label}
      </label>
      {props.children}
      {props.info && <div className={styles.field__info}>{props.info}</div>}
    </div>
  )
}
