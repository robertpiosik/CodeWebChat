import { useEffect, useState } from 'react'
import styles from './ProgressModal.module.scss'
import { Button } from '../../Button'
import { Modal } from '../Modal'
import cn from 'classnames'

export type FileProgressStatus =
  | 'waiting'
  | 'thinking'
  | 'receiving'
  | 'done'
  | 'error'

export type FileProgress = {
  file_path: string
  workspace_name?: string
  status: FileProgressStatus
  progress?: number
  tokens_per_second?: number
}

type Props = {
  title: string
  on_cancel: () => void
  progress?: number
  tokens_per_second?: number
  files?: FileProgress[]
}

const format_tokens_per_second = (tps: number): string => {
  const rounded_tps = Math.round(tps)
  if (rounded_tps >= 1000) {
    return `${(rounded_tps / 1000).toFixed(1)}k`
  }
  return rounded_tps.toString()
}

const get_status_text = (status: FileProgressStatus): string => {
  switch (status) {
    case 'waiting':
      return 'Waiting...'
    case 'thinking':
      return 'Thinking...'
    case 'receiving':
      return 'Receiving...'
    case 'done':
      return 'Done'
    case 'error':
      return 'Error'
  }
}

export const ProgressModal: React.FC<Props> = (props) => {
  const [elapsed_time, set_elapsed_time] = useState(0)

  useEffect(() => {
    set_elapsed_time(0)
    const start_time = Date.now()
    const timer = setInterval(() => {
      set_elapsed_time((Date.now() - start_time) / 1000)
    }, 100)

    return () => clearInterval(timer)
  }, [props.title])

  return (
    <Modal
      title={props.title}
      content_slot={
        <>
          <div className={styles['elapsed-time']}>
            {elapsed_time.toFixed(1)}s
          </div>

          {props.files ? (
            <div className={styles['files-container']}>
              {props.files.map((file) => {
                const last_slash_index = file.file_path.lastIndexOf('/')
                const file_name =
                  last_slash_index === -1
                    ? file.file_path
                    : file.file_path.substring(last_slash_index + 1)
                const directory_path =
                  last_slash_index === -1
                    ? ''
                    : file.file_path.substring(0, last_slash_index)

                return (
                  <div key={file.file_path} className={styles['file-item']}>
                    <div className={styles['file-item__header']}>
                      <div className={styles['file-item__name']}>
                        <span>{file_name}</span>
                        <span>{directory_path}</span>
                      </div>
                      <div
                        className={cn(
                          styles['file-item__status'],
                          styles[`file-item__status--${file.status}`]
                        )}
                      >
                        {get_status_text(file.status)}
                      </div>
                    </div>
                    <div className={styles.progress}>
                      {file.status === 'thinking' ||
                      (file.status === 'receiving' &&
                        file.progress === undefined) ? (
                        <div
                          className={styles['progress__fill--indeterminate']}
                        />
                      ) : (
                        <div
                          className={cn(styles.progress__fill, {
                            [styles['progress__fill--done']]:
                              file.status === 'done',
                            [styles['progress__fill--error']]:
                              file.status === 'error'
                          })}
                          style={{
                            width: `${
                              file.status === 'done' || file.status === 'error'
                                ? 100
                                : file.status === 'receiving' &&
                                  file.progress !== undefined
                                ? file.progress
                                : 0
                            }%`
                          }}
                        />
                      )}
                    </div>
                    {file.status === 'receiving' &&
                      file.tokens_per_second !== undefined && (
                        <div className={styles['file-item__details']}>
                          ~{format_tokens_per_second(file.tokens_per_second)}{' '}
                          tokens/s
                        </div>
                      )}
                  </div>
                )
              })}
            </div>
          ) : (
            <>
              {props.tokens_per_second !== undefined && (
                <div className={styles['tokens-per-second']}>
                  ~{format_tokens_per_second(props.tokens_per_second)} tokens/s
                </div>
              )}
              <div className={styles.progress}>
                {props.progress !== undefined ? (
                  <div
                    className={styles.progress__fill}
                    style={{ width: `${props.progress}%` }}
                  />
                ) : (
                  <div className={styles['progress__fill--indeterminate']} />
                )}
              </div>
            </>
          )}
        </>
      }
      footer_slot={<Button on_click={props.on_cancel}>Cancel</Button>}
    />
  )
}
