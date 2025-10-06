import { useEffect, useState } from 'react'
import styles from './Modal.module.scss'
import cn from 'classnames'

type Props = {
  children: React.ReactNode
}

export const Modal: React.FC<Props> = (props) => {
  const [is_hydrated, set_is_hydrated] = useState(false) // For entry animation

  useEffect(() => {
    set_is_hydrated(true)
  }, [])

  return (
    <div
      className={cn(styles.overlay, {
        [styles['overlay--visible']]: is_hydrated
      })}
    >
      <div className={styles.container}>{props.children}</div>
    </div>
  )
}
