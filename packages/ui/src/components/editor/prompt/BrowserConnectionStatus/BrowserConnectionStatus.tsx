import React, { useEffect, useState } from 'react'
import styles from './BrowserConnectionStatus.module.scss'

type Props = {
  is_connected: boolean
  translations: {
    connected: string
    not_connected: string
    install: string
    hide: string
  }
  on_install: () => void
}

export const BrowserConnectionStatus: React.FC<Props> = (props) => {
  const [is_closed, setIsClosed] = useState(false)

  useEffect(() => {
    if (!props.is_connected) {
      setIsClosed(false)
    }
  }, [props.is_connected])

  if (is_closed) {
    return null
  }

  return (
    <div
      className={`${styles.container} ${
        props.is_connected ? styles.connected : styles.disconnected
      }`}
    >
      <div className={styles.content}>
        <span className={styles.icon}>
          <span
            className={`codicon ${
              props.is_connected
                ? 'codicon-debug-connected'
                : 'codicon-debug-disconnect'
            }`}
          />
        </span>
        <label className={styles.label}>
          <span>
            {props.is_connected
              ? props.translations.connected
              : props.translations.not_connected}
          </span>
        </label>
      </div>
      <div className={styles.actions}>
        {!props.is_connected && (
          <div
            className={styles.actions__item}
            onClick={props.on_install}
            title={props.translations.install}
          >
            <span className="codicon codicon-desktop-download" />
            <span>{props.translations.install}</span>
          </div>
        )}
        {props.is_connected && (
          <div
            className={styles.actions__item}
            onClick={() => setIsClosed(true)}
            title={props.translations.hide}
          >
            <span className="codicon codicon-close-small" />
            <span>{props.translations.hide}</span>
          </div>
        )}
      </div>
    </div>
  )
}
