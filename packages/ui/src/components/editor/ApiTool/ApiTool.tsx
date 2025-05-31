import styles from './ApiTool.module.scss'

type Props = {
  top_line: string
  bottom_line: string
  description: string
  checkmarks?: string[]
}

export const ApiTool: React.FC<Props> = (props) => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.header__top}>
          <span>{props.top_line}</span>
        </div>
        <div className={styles.header__bottom}>{props.bottom_line}</div>
      </div>

      <div className={styles.description}>{props.description}</div>

      {props.checkmarks && (
        <div className={styles.checkmarks}>
          {props.checkmarks.map((checkmark, index) => (
            <div key={index} className={styles.checkmarks__item}>
              <span className="codicon codicon-check" />
              <span>{checkmark}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
