import { FC, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import styles from './TextItem.module.scss'

type Props = {
  content: string
  is_expanded: boolean
  on_toggle: (element: HTMLDivElement) => void
}

export const TextItem: FC<Props> = (props) => {
  const ref = useRef<HTMLDivElement>(null)

  return (
    <>
      {props.is_expanded ? (
        <div
          ref={ref}
          className={styles.text}
          onClick={() => ref.current && props.on_toggle(ref.current)}
        >
          <ReactMarkdown disallowedElements={['hr']}>
            {props.content}
          </ReactMarkdown>
        </div>
      ) : (
        <div
          ref={ref}
          className={styles.hidden}
          onClick={() => ref.current && props.on_toggle(ref.current)}
          title={props.content}
          role="button"
        >
          <div className={styles.line} />
          {Math.floor(props.content.length * 0.25)}
        </div>
      )}
    </>
  )
}
