import styles from './Section.module.scss'
import { forwardRef } from 'react'

type Props = {
  id: string
  title: string
  subtitle: React.ReactNode
  children: React.ReactNode
}

export const Section = forwardRef<HTMLDivElement, Props>(
  ({ id, title, subtitle, children }, ref) => {
    return (
      <div id={id} ref={ref} className={styles.container}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
        {children}
      </div>
    )
  }
)
Section.displayName = 'Section'
