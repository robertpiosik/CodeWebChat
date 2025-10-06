import styles from './Layout.module.scss'
import { forwardRef } from 'react'

type Props = {
  title: string
  sidebar: React.ReactNode
  children: React.ReactNode
}

export const Layout = forwardRef<HTMLDivElement, Props>((props, ref) => {
  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <div className={styles.sidebar__title}>{props.title}</div>
        <div className={styles.sidebar__navigation}>{props.sidebar}</div>
      </div>
      <div className={styles.content} ref={ref}>
        {props.children}
      </div>
    </div>
  )
})
Layout.displayName = 'Layout'
