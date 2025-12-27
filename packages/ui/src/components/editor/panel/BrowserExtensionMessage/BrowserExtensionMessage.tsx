import { useLayoutEffect, useRef } from 'react'

import { use_compacting } from '@shared/hooks/use-compacting'
import styles from './BrowserExtensionMessage.module.scss'

export const BrowserExtensionMessage: React.FC = () => {
  const { container_ref, compact_step, report_width } = use_compacting(2)
  const links_ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (links_ref.current) {
      let width = 0
      const children = links_ref.current.children
      for (let i = 0; i < children.length; i++) {
        const child = children[i] as HTMLElement
        const style = getComputedStyle(child)
        width +=
          child.offsetWidth +
          parseFloat(style.marginLeft) +
          parseFloat(style.marginRight)
      }
      report_width(width, compact_step)
    }
  }, [compact_step, report_width])

  return (
    <div ref={container_ref} className={styles.container}>
      <div className={styles.heading}>Install the Connector for auto-fill</div>
      <div ref={links_ref} className={styles.links}>
        <a href="https://chromewebstore.google.com/detail/code-web-chat-connector/ljookipcanaglfaocjbgdicfbdhhjffp">
          {compact_step >= 2 ? 'Chrome' : 'Chrome Web Store'}
        </a>
        <a href="https://addons.mozilla.org/en-US/firefox/addon/code-web-chat-connector/">
          {compact_step >= 1 ? 'Firefox' : 'Firefox Add-ons'}
        </a>
      </div>
    </div>
  )
}
