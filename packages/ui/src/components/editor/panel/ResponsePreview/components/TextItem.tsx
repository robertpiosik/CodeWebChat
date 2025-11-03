import { FC, useEffect, useRef, useState } from 'react'
import cn from 'classnames'
import ReactMarkdown from 'react-markdown'
import styles from './TextItem.module.scss'

type Props = {
  content: string
  is_expanded: boolean
  on_toggle: () => void
}

export const TextItem: FC<Props> = ({ content, is_expanded, on_toggle }) => {
  const ref = useRef<HTMLDivElement>(null)
  const [is_overflowing, set_is_overflowing] = useState(false)

  useEffect(() => {
    if (ref.current && !is_expanded) {
      set_is_overflowing(ref.current.scrollHeight > ref.current.clientHeight)
    } else {
      set_is_overflowing(false)
    }
  }, [is_expanded, content])

  return (
    <div
      ref={ref}
      className={cn(styles.text, {
        [styles['text--expandable']]: is_expanded || is_overflowing,
        [styles['text--collapsed']]: !is_expanded,
        [styles['text--overflowing']]: !is_expanded && is_overflowing
      })}
      onClick={is_overflowing || is_expanded ? on_toggle : undefined}
    >
      <ReactMarkdown disallowedElements={['hr']}>{content}</ReactMarkdown>
    </div>
  )
}
