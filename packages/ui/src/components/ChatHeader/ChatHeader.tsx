import styles from './ChatHeader.module.scss'

export const ChatHeader: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.links}>
        <a href="https://gemini-coder.netlify.app/">Docs</a>
        <span>·</span>
        <a href="https://github.com/robertpiosik/gemini-coder">GitHub</a>
        <span>·</span>
        <a href="https://github.com/robertpiosik/gemini-coder/discussions">
          Send feedback
        </a>
        <span>·</span>
        <a href="https://marketplace.visualstudio.com/items?itemName=robertpiosik.gemini-coder&ssr=false#review-details">
          Rate
        </a>
        <span>·</span>
        <a href="https://buymeacoffee.com/robertpiosik">Buy me a coffee</a>
      </div>
    </div>
  )
}
