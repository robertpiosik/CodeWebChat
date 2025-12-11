import QRCode from 'react-qr-code'
import styles from './QRCodeModal.module.scss'
import { Modal } from '../Modal'
import { Button } from '../../../common/Button'

type Props = {
  title: string
  value: string
  on_close: () => void
}

export const QRCodeModal: React.FC<Props> = (props) => {
  return (
    <Modal
      title={props.title}
      on_background_click={props.on_close}
      content_max_height="calc(100vh - 150px)"
      content_slot={
        <div className={styles.container}>
          <div className={styles.qr}>
            <QRCode value={props.value} size={100} />
          </div>
          <div className={styles.value}>{props.value}</div>
        </div>
      }
      footer_slot={
        <Button on_click={props.on_close} is_focused={true}>
          Close
        </Button>
      }
    />
  )
}
