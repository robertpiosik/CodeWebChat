import React from 'react'
import styles from './SavedWebsites.module.scss'
import cn from 'classnames'

export type Website = {
  url: string
  content: string
  title?: string
  favicon?: string
}

type Props = {
  websites: Website[]
  on_delete: (url: string) => void
  on_link_click: (url: string) => void
}

export const SavedWebsites: React.FC<Props> = (props) => {
  return (
    <div className={styles.container}>
      {props.websites.map((website) => (
        <div
          key={website.url}
          className={styles.item}
          title={
            (website.title || 'Untitled') +
            ` - ${Math.ceil(website.content.length / 4)} tokens`
          }
        >
          <div className={styles.item__left}>
            <div className={styles.item__left__favicon}>
              {website.favicon && <img src={website.favicon} alt="Favicon" />}
            </div>
            <div
              className={styles.item__left__title}
              onClick={() => props.on_link_click(website.url)}
            >
              {website.title || 'Untitled'}
            </div>
          </div>

          <div className={styles.item__actions}>
            <button
              className={cn(
                styles.item__actions__button,
                styles['item__actions__button--remove']
              )}
              onClick={() => props.on_delete(website.url)}
              title="Remove website"
            />
          </div>
        </div>
      ))}
    </div>
  )
}
