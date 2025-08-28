import React from 'react'
import styles from './Enter.module.scss'

type Props = {
  label: string
  description?: React.ReactNode
  on_click: () => void
}

export const Enter: React.FC<Props> = (props) => {
  return (
    <button
      type="button"
      className={styles.button}
      onClick={props.on_click}
    >
      <div className={styles['button__content']}>
        <div className={styles['button__label']}>{props.label}</div>
        {props.description && (
          <div className={styles['button__description']}>{props.description}</div>
        )}
      </div>
      <span className="codicon codicon-chevron-right" />
    </button>
  )
}
