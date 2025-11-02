import styles from './Page.module.scss'
import { Scrollable } from '../Scrollable'
import { IconButton } from '../IconButton'

type Props = {
  title?: string
  on_back_click?: () => void
  header_slot?: React.ReactNode
  footer_slot?: React.ReactNode
  children: React.ReactNode
}

export const Page: React.FC<Props> = (props) => {
  return (
    <div className={styles.container}>
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
        <div>{props.header_slot}</div>
      </div>
      <Scrollable>{props.children}</Scrollable>
      {props.footer_slot && (
        <div className={styles.footer}>{props.footer_slot}</div>
      )}
    </div>
  )
}
