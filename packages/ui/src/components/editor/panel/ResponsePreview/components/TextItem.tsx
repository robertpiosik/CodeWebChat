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
  const header_ref = useRef<HTMLDivElement>(null)

  return (
    <div className={styles.container}>
      <div
        ref={header_ref}
        className={styles.header}
        onClick={() =>
          header_ref.current && props.on_toggle(header_ref.current)
        }
        title={props.content}
      >
        <IconButton
          codicon_icon={props.is_expanded ? 'chevron-down' : 'chevron-right'}
        />
        <div className={styles.header__line} />
        <span className={styles.header__tokens}>
          {Math.floor(props.content.length * 0.25) || 1}
        </span>
      </div>
      {props.is_expanded && (
        <div
          className={styles.text}
          onClick={() =>
            header_ref.current && props.on_toggle(header_ref.current)
          }
        >
          <ReactMarkdown disallowedElements={['hr']}>
            {props.content}
          </ReactMarkdown>
          <div className={styles.text__collapse}>
            <span>Show less</span>
          </div>
        </div>
      )}
    </div>
  )
}
