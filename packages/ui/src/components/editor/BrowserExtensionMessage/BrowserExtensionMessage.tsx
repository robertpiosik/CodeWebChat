import { FC } from 'react'
import styles from './BrowserExtensionMessage.module.scss'

export const BrowserExtensionMessage: FC = () => {
  return (
    <div className={styles.container}>
      <span>Install Connector for chat initializations</span>
      <div className={styles.links}>
        <a href="https://chromewebstore.google.com/detail/code-web-chat-connector/ljookipcanaglfaocjbgdicfbdhhjffp">
          <span className="codicon codicon-link-external" />
          <span>Chrome Web Store</span>
        </a>
        <a href="https://addons.mozilla.org/en-US/firefox/addon/gemini-coder-connector/">
          <span className="codicon codicon-link-external" />
          <span>Firefox Add-ons</span>
        </a>
      </div>
    </div>
  )
}
