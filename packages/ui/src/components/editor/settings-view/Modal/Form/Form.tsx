import React from 'react'
import styles from './Form.module.scss'
import { Button } from '../../../common/Button'

export type FormProps = {
  title: string
  children: React.ReactNode
  on_save: () => void
  on_cancel?: () => void
  save_label?: string
  cancel_label?: string
  custom_footer_left?: React.ReactNode
}

export const Form: React.FC<FormProps> = ({
  title,
  children,
  on_save,
  on_cancel,
  save_label = 'Save',
  cancel_label = 'Cancel',
  custom_footer_left
}) => {
  return (
    <div className={styles.form}>
      <div className={styles.header}>{title}</div>
      {children}
      <div className={styles.footer}>
        {custom_footer_left && (
          <div className={styles['footer-left']}>{custom_footer_left}</div>
        )}
        {on_cancel && (
          <Button is_secondary on_click={on_cancel}>
            {cancel_label}
          </Button>
        )}
        <Button on_click={on_save}>{save_label}</Button>
      </div>
    </div>
  )
}
