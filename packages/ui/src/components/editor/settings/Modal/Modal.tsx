import React from 'react'
import styles from './Modal.module.scss'
import { Form } from './Form'

export type ModalProps = {
  children: React.ReactNode
  on_close?: () => void
}

const ModalRoot: React.FC<ModalProps> = ({ children, on_close }) => {
  return (
    <div
      className={styles.overlay}
      onClick={on_close}
    >
      <div onClick={(e) => e.stopPropagation()} className={styles.inner}>
        {children}
      </div>
    </div>
  )
}

export type { FormProps } from './Form'

export const Modal = Object.assign(ModalRoot, {
  Form
})
