import styles from './HomeViewTypeToggler.module.scss'

type Props = {
  label: string
  on_click: () => void
}

export const HomeViewTypeToggler: React.FC<Props> = (props) => {
  return (
    <button
      className={styles['home-view-type-toggler']}
      onClick={props.on_click}
      title="Toggle view type"
    >
      {props.label}
    </button>
  )
}