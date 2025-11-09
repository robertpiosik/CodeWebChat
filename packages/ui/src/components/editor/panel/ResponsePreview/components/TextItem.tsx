import { FC, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import styles from './TextItem.module.scss'
import { IconButton } from '../../IconButton/IconButton'

type Props = {
  content: string
}

export const TextItem: FC<Props> = ({ content }) => {
  const [is_hidden, set_is_hidden] = useState(true)

  if (is_hidden) {
    return (
      <div className={styles.hidden}>
        <div className={styles.line} />
        <IconButton
          codicon_icon="add"
          on_click={() => set_is_hidden(false)}
          title="Show text"
        />
        <div className={styles.line} />
      </div>
    )
  }

  return (
    <div
      className={styles.text}
      onClick={() => {
        set_is_hidden(true)
      }}
    >
      <ReactMarkdown disallowedElements={['hr']}>{content}</ReactMarkdown>
    </div>
  )
}
