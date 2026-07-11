import styles from './Layout.module.scss'
import { Footer } from './Footer'

type Props = {
  children: React.ReactNode
  are_links_dimmed?: boolean
}

export const Layout: React.FC<Props> = (props) => {
  return (
    <div className={styles.container}>
      <div className={styles.content}>{props.children}</div>
      <Footer are_links_dimmed={props.are_links_dimmed} />
    </div>
  )
}
