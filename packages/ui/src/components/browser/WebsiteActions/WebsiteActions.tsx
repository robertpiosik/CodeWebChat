import React from 'react'
import styles from './WebsiteActions.module.scss'
import cn from 'classnames'

type Props = {
  is_loading?: boolean
  has_content: boolean
  is_saved: boolean
  on_save: () => void
  on_remove: () => void
}

export const WebsiteActions: React.FC<Props> = (props) => {
  if (props.is_loading === undefined) {
    return <div className={styles.container} />
  }

  return (
    <div className={styles.container}>
      {!props.is_loading ? (
        <>
          {props.has_content ? (
            <div className={styles.actions}>
              {!props.is_saved ? (
                <button
                  onClick={props.on_save}
                  className={cn(
                    styles.actions__button,
                    styles['actions__button--save']
                  )}
                >
                  Enable for context
                </button>
              ) : (
                <button
                  onClick={props.on_remove}
                  className={cn(
                    styles.actions__button,
                    styles['actions__button--delete']
                  )}
                >
                  Remove
                </button>
              )}
            </div>
          ) : (
            <p className={styles.message}>
              No content could be parsed from this tab.
            </p>
          )}
        </>
      ) : (
        <p className={styles.message}>Loading...</p>
      )}
    </div>
  )
}
