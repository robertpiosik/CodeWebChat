import styles from './Page.module.scss'

type Props = {
  title: string
  subtitle: React.ReactNode
  children: React.ReactNode
}

export const Page: React.FC<Props> = ({ title, subtitle, children }) => {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.subtitle}>{subtitle}</p>
      {children}
    </div>
  )
}
