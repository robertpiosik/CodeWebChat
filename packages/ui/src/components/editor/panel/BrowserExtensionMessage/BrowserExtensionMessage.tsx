import styles from './BrowserExtensionMessage.module.scss'

export const BrowserExtensionMessage: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.heading}>
        Install Connector for chat initializations
      </div>
      <div className={styles.links}>
        <a href="https://chromewebstore.google.com/detail/code-web-chat-connector/ljookipcanaglfaocjbgdicfbdhhjffp">
          Chrome Web Store
        </a>
        <a href="https://addons.mozilla.org/en-US/firefox/addon/code-web-chat-connector/">
          Firefox Add-ons
        </a>
      </div>
    </div>
  )
}
