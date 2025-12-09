import styles from './Toggler.module.scss'

type Props = {
  is_on: boolean
  on_toggle: (is_on: boolean) => void
  id?: string
}

export const Toggler: React.FC<Props> = (props) => {
  const handle_change = (e: React.ChangeEvent<HTMLInputElement>) => {
    props.on_toggle(e.target.checked)
  }

  return (
    <label className={styles.toggler} htmlFor={props.id}>
      <input
        id={props.id}
        type="checkbox"
        checked={props.is_on}
        onChange={handle_change}
      />
      <span className={styles.slider}></span>
    </label>
  )
}
