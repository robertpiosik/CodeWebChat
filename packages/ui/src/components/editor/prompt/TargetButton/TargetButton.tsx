import styles from './TargetButton.module.scss'
import cn from 'classnames'

type Props = {
  label: string
  on_click: () => void
  is_compact?: boolean
}

export const TargetButton: React.FC<Props> = (props) => {
  return (
    <button
      className={cn(styles.button, {
        [styles['button--compact']]: props.is_compact
      })}
      onClick={props.on_click}
    >
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
