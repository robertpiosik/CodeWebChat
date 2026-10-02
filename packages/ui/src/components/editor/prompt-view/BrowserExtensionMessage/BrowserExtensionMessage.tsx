import { use_compacting } from '@shared/hooks/use-compacting'
import styles from './BrowserExtensionMessage.module.scss'

export const BrowserExtensionMessage: React.FC = () => {
  const { container_ref, compact_step } = use_compacting()

  return (
    <div ref={container_ref} className={styles.container}>
      <div className={styles.heading}>Enable autofill in chatbots</div>
      <div className={styles.links}>
        <a href="https://chromewebstore.google.com/detail/autofill-for-code-web-chat/ljookipcanaglfaocjbgdicfbdhhjffp">
          {compact_step >= 2 ? 'Chrome' : 'Chrome Web Store'}
        </a>
        <a href="https://addons.mozilla.org/en-US/firefox/addon/autofill-for-code-web-chat/">
          {compact_step >= 1 ? 'Firefox' : 'Firefox Add-ons'}
        </a>
      </div>
    </div>
  )
}
