import styles from './Intro.module.scss'

type Props = {
  on_open_home_view: () => void
  version: string
}

export const Intro: React.FC<Props> = (props) => {
  return (
    <div className={styles.container}>
      <div className={styles.top}>
        <div className={styles.top__heading}>
          <div className={styles.top__heading__title}>Code Web Chat</div>
          <div className={styles.top__heading__subtitle}>AI workflow tool</div>
        </div>
        <button
          className={styles.top__button}
          onClick={props.on_open_home_view}
        >
          <span className="codicon codicon-arrow-right" />
          <span>Continue</span>
        </button>
      </div>
      <div className={styles.bottom}>
        <a className={styles.bottom__website} href="https://codeweb.chat/">
          https://codeweb.chat
        </a>
        <div className={styles.bottom__version}>{props.version}</div>
      </div>
    </div>
  )
}
