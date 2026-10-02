import { FC, ReactNode } from 'react'
import styles from './KeycapWrapper.module.scss'
import cn from 'classnames'

export namespace KeycapWrapper {
  export type Props = {
    char?: string
    children: ReactNode
    className?: string
    full_width?: boolean
  }
}

export const KeycapWrapper: FC<KeycapWrapper.Props> = (props) => {
  return (
    <div
      className={cn(styles.wrapper, props.className, {
        [styles['wrapper--full-width']]: props.full_width
      })}
    >
      {props.children}
      {props.char && <span className={styles.keycap}>{props.char}</span>}
    </div>
  )
}
