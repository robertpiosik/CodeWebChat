import { FC, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import styles from './TextItem.module.scss'
import { IconButton } from '../../IconButton'

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
          <div className={styles.text__collapse}>
            <span>Show less</span>
          </div>
        </div>
      ) : (
        <div
          ref={ref}
          className={styles.hidden}
          onClick={() => ref.current && props.on_toggle(ref.current)}
          title={props.content}
          role="button"
        >
          <div className={styles.hidden__line} />
          <span className={styles.hidden__tokens}>
            {Math.floor(props.content.length * 0.25) || 1}
          </span>
        </div>
      )}
    </>
  )
}
