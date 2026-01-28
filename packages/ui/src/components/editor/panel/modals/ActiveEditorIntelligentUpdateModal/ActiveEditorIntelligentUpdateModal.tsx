import { FC } from 'react'
import styles from './ActiveEditorIntelligentUpdateModal.module.scss'
import { Button } from '../../../common/Button'
import { Modal } from '../Modal'
import cn from 'classnames'

export type FileProgressStatus =
  | 'waiting'
  | 'thinking'
  | 'receiving'
  | 'retrying'

type Props = {
  title: string
  on_cancel?: () => void
  status?: FileProgressStatus
  progress?: number
  tokens_per_second?: number
  total_tokens?: number
}

const format_tokens = (tokens: number): string => {
  const rounded = Math.round(tokens)
  if (rounded >= 1000) {
    return `${(rounded / 1000).toFixed(1)}k`
  }
  return rounded.toString()
}

const get_status_text = (status: FileProgressStatus): string => {
  switch (status) {
    case 'waiting':
      return 'Waiting...'
    case 'thinking':
      return 'Thinking...'
    case 'receiving':
      return 'Receiving...'
    case 'retrying':
      return 'Retrying...'
  }
}

export const ActiveEditorIntelligentUpdateModal: FC<Props> = (props) => {
  return (
    <div
      onKeyDown={(e) => {
        if (e.key == 'Escape') {
          e.stopPropagation()
          props.on_cancel?.()
        }
      }}
    >
      <Modal
        title={props.title}
        content_max_height={props.status ? 'calc(100vh - 150px)' : undefined}
        content_slot={
          <>
            {props.status ? (
              <div className={styles.content}>
                {(() => {
                  return (
                    <div className={styles['file-item']}>
                      <div className={styles['file-item__bottom']}>
                        <div className={styles['file-item__bottom__status']}>
                          {get_status_text(props.status)}
                        </div>
                        <div className={styles['file-item__bottom__right']}>
                          {props.status == 'receiving' &&
                            props.progress !== undefined && (
                              <div>{Math.round(props.progress)}%</div>
                            )}
                          {props.status == 'receiving' &&
                            props.tokens_per_second !== undefined && (
                              <div>
                                ({format_tokens(props.tokens_per_second)}{' '}
                                tokens/s)
                              </div>
                            )}
                        </div>
                      </div>
                      <div className={styles.progress}>
                        {props.status == 'thinking' ||
                        props.status == 'retrying' ||
                        (props.status == 'receiving' &&
                          props.progress === undefined) ? (
                          <div
                            className={styles['progress__fill--indeterminate']}
                          />
                        ) : (
                          <div
                            className={cn(styles.progress__fill)}
                            style={{
                              width: `${
                                props.status == 'receiving' &&
                                props.progress !== undefined
                                  ? props.progress
                                  : 0
                              }%`
                            }}
                          />
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>
            ) : (
              <div className={styles.content}>
                <div className={styles.progress}>
                  <div className={styles['progress__fill--indeterminate']} />
                </div>
              </div>
            )}
          </>
        }
        footer_slot={
          props.on_cancel ? (
            <Button on_click={props.on_cancel}>Cancel</Button>
          ) : undefined
        }
      />
    </div>
  )
}
