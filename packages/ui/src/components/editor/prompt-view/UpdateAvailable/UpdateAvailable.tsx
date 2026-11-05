import React from 'react'
import { Button } from '../../common/Button'
import styles from './UpdateAvailable.module.scss'
import cn from 'classnames'

type Props = {
  on_update: () => void
  is_updating?: boolean
  current_version: string
  latest_version?: string
  translations: {
    title: string
    button: string
    age?: React.ReactNode
    changelog?: React.ReactNode
  }
}

export const UpdateAvailable: React.FC<Props> = (props) => {
  const [is_expanded, set_is_expanded] = React.useState(false)
  const [is_updating_local, set_is_updating_local] = React.useState(false)

  const is_updating = props.is_updating || is_updating_local

  return (
    <div
      className={styles.wrapper}
      onClick={() => set_is_expanded(!is_expanded)}
      role="button"
      tabIndex={0}
    >
      <div className={styles.header}>
        <div className={styles.title}>
          <span className={styles.text}>{props.translations.title}</span>
          <span
            className={cn('codicon', {
              'codicon-chevron-down': is_expanded,
              'codicon-chevron-right': !is_expanded
            })}
          />
        </div>
        <Button
          on_click={(e) => {
            e.stopPropagation()
            set_is_updating_local(true)
            props.on_update()
          }}
          is_small
          disabled={is_updating}
        >
          {props.translations.button}
        </Button>
      </div>
      {is_expanded && (
        <div className={styles.details}>
          <span className={styles.versions}>
            {props.current_version}
            {props.latest_version && <> → {props.latest_version}</>}
          </span>
          {props.translations.age && <span>{props.translations.age}</span>}
          {props.translations.changelog && (
            <span>{props.translations.changelog}</span>
          )}
        </div>
      )}
    </div>
  )
}
