import styles from './Layout.module.scss'

type Props = {
  title: string
  sidebar: React.ReactNode
  children: React.ReactNode
}

export const Layout: React.FC<Props> = (props) => {
  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <div className={styles.sidebar__title}>{props.title}</div>
        <div className={styles.sidebar__navigation}>{props.sidebar}</div>
      </div>
      <div className={styles.content}>{props.children}</div>
    </div>
  )
}
