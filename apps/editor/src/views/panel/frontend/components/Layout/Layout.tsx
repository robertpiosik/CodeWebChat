import styles from './Layout.module.scss'
import { Footer } from './Footer'

type Props = {
  children: React.ReactNode
  on_donate_click: () => void
  are_links_dimmed?: boolean
  has_some_git_repositories: boolean
}

export const Layout: React.FC<Props> = ({
  children,
  on_donate_click,
  are_links_dimmed,
  has_some_git_repositories
}) => {
  return (
    <div className={styles.container}>
      <div className={styles.content}>{children}</div>
      <Footer
        on_donate_click={on_donate_click}
        are_links_dimmed={are_links_dimmed}
        has_some_git_repositories={has_some_git_repositories}
      />
    </div>
  )
}
