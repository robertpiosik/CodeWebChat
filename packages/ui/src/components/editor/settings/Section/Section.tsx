import styles from './Section.module.scss'
import { forwardRef } from 'react'

type Props = {
  title: string
  subtitle: React.ReactNode
  children: React.ReactNode
}

export const Section = forwardRef<HTMLDivElement, Props>((props, ref) => {
  return (
    <div ref={ref} className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>{props.title}</div>
        <div className={styles.subtitle}>{props.subtitle}</div>
      </div>
      {props.children}
    </div>
  )
})
Section.displayName = 'Section'
