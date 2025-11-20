import styles from './ModeButton.module.scss'

type Props = {
  label: string
  pre: React.ReactNode
  on_click: () => void
}

export const ModeButton: React.FC<Props> = (props) => {
  return (
    <button className={styles.button} onClick={props.on_click}>
      <div className={styles['button__pre']}>{props.pre}</div>
      <div className={styles['button__label']}>
        {props.label.split('').map((char, index) => (
          <span
            key={index}
            className={styles['button__label-char']}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            {char == ' ' ? '\u00A0' : char}
          </span>
        ))}
      </div>
    </button>
  )
}
