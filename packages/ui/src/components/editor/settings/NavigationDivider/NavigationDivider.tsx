import styles from './NavigationDivider.module.scss'
import React from 'react'

type Props = {
  text?: string
}

export const NavigationDivider: React.FC<Props> = ({ text }) => {
  if (!text) {
    return <div className={styles.line} />
  }

  return <div className={styles.text}>{text}</div>
}
