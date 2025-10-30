import { useEffect, useState } from 'react'
import { Modal } from '../Modal'
import styles from './ApplyingChangesModal.module.scss'

type Props = {
  title: string
}

export const ApplyingChangesModal: React.FC<Props> = (props) => {
  const [show_modal, set_show_modal] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      set_show_modal(true)
    }, 1000)

    return () => {
      clearTimeout(timer)
    }
  }, [])

  if (!show_modal) {
    return null
  }

  return (
    <Modal
      title={props.title}
      content_slot={
        <div className={styles.spinner_container}>
          <div className={styles.spinner} />
        </div>
      }
    />
  )
}
