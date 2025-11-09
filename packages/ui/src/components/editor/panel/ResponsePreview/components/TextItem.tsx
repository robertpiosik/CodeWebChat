import { FC, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import styles from './TextItem.module.scss'
import { IconButton } from '../../IconButton'

type Props = {
  content: string
  is_expanded: boolean
  on_toggle: (element: HTMLDivElement) => void
}

export const TextItem: FC<Props> = ({ content, is_expanded, on_toggle }) => {
  const ref = useRef<HTMLDivElement>(null)

  return (
    <>
      {is_expanded ? (
        <div
          ref={ref}
          className={styles.text}
          onClick={() => ref.current && on_toggle(ref.current)}
        >
          <ReactMarkdown disallowedElements={['hr']}>{content}</ReactMarkdown>
        </div>
      ) : (
        <div ref={ref} className={styles.hidden}>
          <div className={styles.line} />
          <IconButton
            codicon_icon="list-flat"
            on_click={() => ref.current && on_toggle(ref.current)}
            title="Show text"
          />
          <div className={styles.line} />
        </div>
      )}
    </>
  )
}
