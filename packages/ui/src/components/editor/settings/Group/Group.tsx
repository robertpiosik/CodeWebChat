import { useEffect, useRef, useState } from 'react'
import styles from './Group.module.scss'
import {
  GROUP_TITLE_HEIGHT,
  SECTION_HEADER_HEIGHT
} from '../../../../constants/sizes'

type Props = {
  children: React.ReactNode
  title?: string
  is_last?: boolean
}

export const Group: React.FC<Props> = (props) => {
  const ref = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number>(0)

  console.log(height)

  useEffect(() => {
    if (!props.is_last || !ref.current) return

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0]
      if (entry) {
        setHeight(entry.contentRect.height)
      }
    })

    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [props.is_last])

  return (
    <div
      ref={ref}
      className={props.title ? styles.wrapper : undefined}
      style={
        props.is_last && height > 0
          ? {
              paddingBottom: `calc(100vh - ${height}px - ${SECTION_HEADER_HEIGHT}px)`
            }
          : undefined
      }
    >
      {props.title && (
        <div className={styles.title} style={{ height: GROUP_TITLE_HEIGHT }}>
          {props.title}
        </div>
      )}
      <div>{props.children}</div>
    </div>
  )
}
