import cn from 'classnames'
import styles from './Page.module.scss'
import { Scrollable } from '../Scrollable'
import { IconButton } from '../IconButton'

type Props = {
  title?: string
  on_back_click?: () => void
  on_close_click?: () => void
  header_slot?: React.ReactNode
  children: React.ReactNode
  has_outline?: boolean
}

export const Page: React.FC<Props> = (props) => {
  return (
    <div
      className={cn(styles.container, {
        [styles['container--has-outline']]: props.has_outline
      })}
    >
      <div className={styles.header}>
        {props.title && (
          <div className={styles.header__title}>{props.title}</div>
        )}
        <div>
          {props.on_back_click && (
            <IconButton
              codicon_icon="chevron-left"
              on_click={props.on_back_click}
              title="Return to previous screen"
            />
          )}
        </div>
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
      <Scrollable>{props.children}</Scrollable>
    </div>
  )
}
