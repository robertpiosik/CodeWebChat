import { FC, useEffect, useRef, useState } from 'react'
import cn from 'classnames'
import ReactMarkdown from 'react-markdown'
import styles from './TextItem.module.scss'

type Props = {
  content: string
}

export const TextItem: FC<Props> = ({ content }) => {
  const [is_expanded, set_is_expanded] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const [is_overflowing, set_is_overflowing] = useState(false)

  useEffect(() => {
    if (ref.current && !is_expanded) {
      set_is_overflowing(ref.current.scrollHeight > ref.current.clientHeight)
    } else {
      set_is_overflowing(false)
    }
  }, [content, is_expanded])

  return (
    <div
      ref={ref}
      className={cn(styles.text, {
        [styles['text--expandable']]: is_expanded || is_overflowing,
        [styles['text--collapsed']]: !is_expanded,
        [styles['text--overflowing']]: !is_expanded && is_overflowing
      })}
      onClick={
        is_overflowing || is_expanded
          ? () => set_is_expanded((prev) => !prev)
          : undefined
      }
    >
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  )
}
