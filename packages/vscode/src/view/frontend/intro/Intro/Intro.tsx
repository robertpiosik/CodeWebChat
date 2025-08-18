import styles from './Intro.module.scss'
import { Scrollable } from '@ui/components/editor/Scrollable'

type Props = {
  on_open_home_view: () => void
  version: string
}

export const Intro: React.FC<Props> = (props) => {
  return (
    <div className={styles.container}>
      <Scrollable>
        <div className={styles.inner}>
          <div className={styles.top}>
            <div
              className={styles.top__heading}
              onClick={props.on_open_home_view}
              role="button"
            >
              <div className={styles.top__heading__title}>Code Web Chat</div>
              <div className={styles.top__heading__subtitle}>
                The free vibe coding
              </div>
            </div>
            <button
              className={styles.top__button}
              onClick={props.on_open_home_view}
            >
              <span className="codicon codicon-arrow-right" />
              <span>Launch CWC</span>
            </button>
            <a className={styles.top__button} href="https://codeweb.chat/">
              <span className="codicon codicon-book" />
              <span>Documentation</span>
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
      </Scrollable>
    </div>
  )
}
