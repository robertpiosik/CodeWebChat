import React from 'react'
import styles from './Layout.module.scss'

type Props = {
  title: string
  navigation: React.ReactNode
  children: React.ReactNode
}

export const Layout: React.FC<Props> = (props) => {
  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <div className={styles.sidebar__title}>{props.title}</div>
        <div className={styles.sidebar__navigation}>{props.navigation}</div>
      </div>
      <div className={styles.content}>{props.children}</div>
    </div>
  )
}
