import React from 'react'
import styles from './ConfigurationHeader.module.scss'

type Props = {
  top_line: string
  bottom_line: string
  description: string
}

export const ConfigurationHeader: React.FC<Props> = (props) => {
  return (
    <div className={styles.header}>
      <div className={styles.header__top}>{props.top_line}</div>
      <div className={styles.header__bottom}>{props.bottom_line}</div>
      <div className={styles.header__description}>{props.description}</div>
    </div>
  )
}
