import styles from './Layout.module.scss'
import { Footer } from './Footer'

type Props = {
  children: React.ReactNode
}

export const Layout: React.FC<Props> = (props) => {
  return (
    <div className={styles.container}>
      <div className={styles.content}>{props.children}</div>
      <Footer />
    </div>
  )
}
