import React from 'react'
import { Button } from '../../common/Button'
import styles from './UpdateAvailable.module.scss'
import cn from 'classnames'

type Props = {
  on_update: () => void
  translations: {
    title: string
    button: string
    installed_version: React.ReactNode
    latest_version: React.ReactNode
    age?: React.ReactNode
  }
}

export const UpdateAvailable: React.FC<Props> = (props) => {
  const [is_expanded, set_is_expanded] = React.useState(false)

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
            props.on_update()
          }}
          is_small
        >
          {props.translations.button}
        </Button>
      </div>
      {is_expanded && (
        <div className={styles.details}>
          <span>{props.translations.installed_version}</span>
          <span>{props.translations.latest_version}</span>
          {props.translations.age && <span>{props.translations.age}</span>}
        </div>
      )}
    </div>
  )
}
