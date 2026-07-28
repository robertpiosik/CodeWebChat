import React from 'react'
import styles from './Chats.module.scss'

type Props = {
  chats: { timestamp: number }[]
  on_delete: (timestamp: number) => void
}

export const Chats: React.FC<Props> = (props) => {
  return (
    <div className={styles.container}>
      {props.chats.map((chat) => {
        const date = new Date(chat.timestamp)
        return (
          <div key={chat.timestamp} className={styles.item}>
            <span>{date.toLocaleString()}</span>
            <button
              className={styles.item__delete}
              onClick={() => props.on_delete(chat.timestamp)}
              title="Delete chat"
            />
          </div>
        )
      })}
    </div>
  )
}
