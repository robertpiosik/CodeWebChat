import styles from './Layout.module.scss'
import { Footer } from './Footer'

type Props = {
  children: React.ReactNode
  on_donate_click: () => void
  are_links_dimmed?: boolean
}

export const Layout: React.FC<Props> = (props) => {
  return (
    <div className={styles.container}>
      <div className={styles.content}>{props.children}</div>
      <Footer
        on_donate_click={props.on_donate_click}
        are_links_dimmed={props.are_links_dimmed}
      />
    </div>
  )
}
