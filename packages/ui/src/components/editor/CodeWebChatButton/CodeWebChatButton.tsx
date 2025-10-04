import styles from './CodeWebChatButton.module.scss'
import { Icon } from '../Icon'
import { dictionary } from '@shared/constants/dictionary'

export type CodeWebChatButton = {
  url: string
}

export const CodeWebChatButton: React.FC<CodeWebChatButton> = (props) => {
  return (
    <a
      href={props.url}
      className={styles.button}
      title={dictionary.code_web_chat_button.visit_website}
    >
      <span className={styles.left}>
        <Icon variant="CODE_WEB_CHAT_FACE" />
        <Icon variant="CODE_WEB_CHAT_TEXT" />
      </span>
      <span className="codicon codicon-link-external" />
    </a>
  )
}
