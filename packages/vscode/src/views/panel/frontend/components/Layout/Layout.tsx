import styles from './Layout.module.scss'
import { Footer } from './Footer'

type Props = {
  children: React.ReactNode
  on_donate_click: () => void
}

export const Layout: React.FC<Props> = ({ children, on_donate_click }) => {
  return (
    <div className={styles.container}>
      <div className={styles.content}>{children}</div>
      <Footer on_donate_click={on_donate_click} />
    </div>
  )
}
