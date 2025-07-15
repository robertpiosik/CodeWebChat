import styles from './Intro.module.scss'

type Props = {
  on_open_home_view: () => void
  version: string
}

export const Intro: React.FC<Props> = (props) => {
  return (
    <div className={styles.container}>
      <div className={styles.top}>
        <div className={styles.top__heading} onClick={props.on_open_home_view}>
          <div className={styles.top__heading__title}>Code Web Chat</div>
          <div className={styles.top__heading__subtitle}>AI workflow tool</div>
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
          <span>Go to codeweb.chat</span>
        </a>
      </div>
      <div className={styles.bottom}>
        <div className={styles.bottom__version}>{props.version}</div>
        <div className={styles.bottom__author}>
          © {new Date().getFullYear()}{' '}
          <a href="https://x.com/robertpiosik">Robert Piosik</a>
        </div>
      </div>
    </div>
  )
}
