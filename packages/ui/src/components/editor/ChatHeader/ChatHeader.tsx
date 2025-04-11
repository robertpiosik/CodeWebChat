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
          Feedback
        </a>
        <span>·</span>
        <a href="https://marketplace.visualstudio.com/items?itemName=robertpiosik.gemini-coder&ssr=false#review-details">
          Rate
        </a>
        <span>·</span>
        <a href="https://buymeacoffee.com/robertpiosik">
          <i
            className="codicon codicon-coffee"
            aria-hidden="true"
            style={{ transform: 'translateY(1px)', fontSize: 'inherit' }}
          ></i>{' '}
          Buy me a coffee
        </a>
      </div>
    </div>
  )
}
