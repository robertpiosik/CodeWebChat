import styles from './Intro.module.scss'
import { useState, useEffect, useRef } from 'react'
import SimpleBar from 'simplebar-react'
import cn from 'classnames'

type Props = {
  on_open_home_view: () => void
  version: string
}

export const Intro: React.FC<Props> = (props) => {
  const [has_top_shadow, set_has_top_shadow] = useState(false)
  const simplebar_ref = useRef<any>(null)

  useEffect(() => {
    const simplebar_instance = simplebar_ref.current
    if (!simplebar_instance) return

    const scroll_element = simplebar_instance.getScrollElement()
    if (!scroll_element) return

    const update_shadows = () => {
      const { scrollTop, scrollHeight, clientHeight } = scroll_element
      const is_scrollable = scrollHeight > clientHeight

      set_has_top_shadow(is_scrollable && scrollTop > 0)
    }

    update_shadows()

    scroll_element.addEventListener('scroll', update_shadows)

    const content_element = simplebar_instance.getContentElement()
    const resize_observer = new ResizeObserver(update_shadows)
    if (content_element) {
      resize_observer.observe(content_element)
    }

    return () => {
      scroll_element.removeEventListener('scroll', update_shadows)
      resize_observer.disconnect()
    }
  }, [])

  return (
    <div className={styles.container}>
      <div
        className={cn(styles.scrollable, {
          [styles['scrollable--shadow']]: has_top_shadow
        })}
      >
        <SimpleBar
          ref={simplebar_ref}
          style={{
            height: '100%'
          }}
        >
          <div className={styles.inner}>
            <div className={styles.top}>
              <div
                className={styles.top__heading}
                onClick={props.on_open_home_view}
              >
                <div className={styles.top__heading__title}>Code Web Chat</div>
                <div className={styles.top__heading__subtitle}>
                  AI workflow tool
                </div>
              </div>
              <button
                className={styles.top__button}
                onClick={props.on_open_home_view}
              >
                <span className="codicon codicon-arrow-right" />
                <span>Start coding with CWC</span>
              </button>
              <a className={styles.top__button} href="https://codeweb.chat/">
                <span className="codicon codicon-link-external" />
                <span>Visit codeweb.chat</span>
              </a>
              <a
                className={styles.top__button}
                href="https://buymeacoffee.com/robertpiosik"
              >
                <span className="codicon codicon-coffee" />
                <span>Support author</span>
              </a>
            </div>
            <div className={styles.bottom}>
              <div className={styles.bottom__version}>{props.version}</div>
              <div>
                Released under the{' '}
                <a href="https://github.com/robertpiosik/CodeWebChat/blob/dev/LICENSE">
                  GPL-3.0 license
                </a>
              </div>
              <div className={styles.bottom__author}>
                Copyright © {new Date().getFullYear()}{' '}
                <a href="https://x.com/robertpiosik">Robert Piosik</a>
              </div>
            </div>
          </div>
        </SimpleBar>
      </div>
    </div>
  )
}
