import styles from './Page.module.scss'
import { IconButton } from '../IconButton/IconButton'
import { Scrollable } from '../Scrollable'

type Props = {
  title?: string
  on_back_click?: () => void
  on_close_click?: () => void
  header_slot?: React.ReactNode
  children: React.ReactNode
}

export const Page: React.FC<Props> = (props) => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        {props.title && (
          <div className={styles.header__title}>{props.title}</div>
        )}
        {props.on_back_click && (
          <IconButton
            codicon_icon="chevron-left"
            on_click={props.on_back_click}
            title="Return to previous screen"
          />
        )}
        <div className={styles.header__right}>
          <div className={styles.header__right__slot}>{props.header_slot}</div>
          {props.on_close_click && (
            <IconButton
              codicon_icon="chrome-close"
              on_click={props.on_close_click}
              title="Close"
            />
          )}
        </div>
      </div>
      <Scrollable>
        <div className={styles.content__inner}>{props.children}</div>
      </Scrollable>
    </div>
  )
}
