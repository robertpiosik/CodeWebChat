import styles from './RecentCoffees.module.scss'

type Props = {
  coffees: { name: string; note?: string }[]
}

export const RecentCoffees: React.FC<Props> = (props) => {
  return (
    <div className={styles.list}>
      {props.coffees.map((coffee, i) => (
        <div key={i} className={styles.list__item}>
          <div className={styles.list__item__heading}>
            <span className={styles.list__item__heading__username}>
              {coffee.name}
            </span>
            became a supporter.
          </div>

          {coffee.note && (
            <div className={styles.list__item__note}>{coffee.note}</div>
          )}
        </div>
      ))}
    </div>
  )
}
