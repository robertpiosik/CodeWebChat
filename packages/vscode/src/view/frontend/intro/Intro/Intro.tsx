import styles from './Intro.module.scss'
import { Scrollable } from '@ui/components/editor/Scrollable'
import { Enter } from '@ui/components/editor/Enter'

type Props = {
  on_new_chat: () => void
  on_api_call: () => void
  version: string
}

export const Intro: React.FC<Props> = (props) => {
  return (
    <div className={styles.container}>
      <Scrollable>
        <div className={styles.inner}>
          <div className={styles.top}>
            <div className={styles['top__enter-buttons']}>
              <Enter
                label="New chat"
                description="Send prompt via chatbot"
                on_click={props.on_new_chat}
              />
              <Enter
                label="API call"
                description="Send prompt to an API provider"
                on_click={props.on_api_call}
              />
            </div>
            <div className={styles.top__links}>
              <a
                className={styles.top__links__link}
                href="https://codeweb.chat/"
              >
                <span className="codicon codicon-book" />
                <span>Documentation</span>
              </a>
              <a
                className={styles.top__links__link}
                href="https://buymeacoffee.com/robertpiosik"
              >
                <span className="codicon codicon-coffee" />
                <span>Support author</span>
              </a>
            </div>
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
      </Scrollable>
    </div>
  )
}
