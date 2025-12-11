import { useState } from 'react'
import { QRCodeModal } from './QRCodeModal'

export default {
  component: QRCodeModal
}

export const Default = () => {
  const [visible, set_visible] = useState(true)

  return visible ? (
    <QRCodeModal
      title="Bitcoin"
      value="bc1qfzajl0fc4347knr6n5hhuk52ufr4sau04su5te"
      on_close={() => set_visible(false)}
    />
  ) : (
    <button onClick={() => set_visible(true)}>Show Modal</button>
  )
}
