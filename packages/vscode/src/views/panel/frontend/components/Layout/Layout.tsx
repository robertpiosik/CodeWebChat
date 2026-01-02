import styles from './Layout.module.scss'
import { Footer } from './Footer'

type Props = {
  children: React.ReactNode
  on_donate_click: () => void
  are_links_dimmed?: boolean
}

export const Layout: React.FC<Props> = ({
  children,
  on_donate_click,
  are_links_dimmed
}) => {
  return (
    <div className={styles.container}>
      <div className={styles.content}>{children}</div>
      <Footer
        on_donate_click={on_donate_click}
        are_links_dimmed={are_links_dimmed}
      />
    </div>
  )
}
