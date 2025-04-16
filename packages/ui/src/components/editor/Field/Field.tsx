import React from 'react'
import styles from './Field.module.scss'

type Props = {
  label: string
  htmlFor?: string
  info?: React.ReactNode
  children: React.ReactNode
}

export const Field: React.FC<Props> = ({ label, htmlFor, info, children }) => {
  return (
    <div className={styles.field}>
      <label htmlFor={htmlFor} className={styles.field__label}>
        {label}
      </label>
      {children}
      {info && <div className={styles.field__info}>{info}</div>}
    </div>
  )
}
