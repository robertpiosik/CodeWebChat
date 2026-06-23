import React from 'react'
import styles from './Form.module.scss'
import { Button } from '../../../common/Button'

export type FormProps = {
  title: string
  children: React.ReactNode
  on_save: () => void
  on_cancel?: () => void
  save_label?: string
}

export const Form: React.FC<FormProps> = ({ title, children, on_save, on_cancel, save_label = 'Save' }) => {
  return (
    <div className={styles.form}>
      <div className={styles.header}>{title}</div>
      <div className={styles.body}>{children}</div>
      <div className={styles.footer}>
        {on_cancel && (
          <Button is_secondary on_click={on_cancel}>
            Cancel
          </Button>
        )}
        <Button on_click={on_save}>{save_label}</Button>
      </div>
    </div>
  )
}
