import React from 'react'
import styles from './BuyMeACoffee.module.scss'
import { Icon } from '../Icon'

type Props = {
  username: string
}

export const BuyMeACoffee: React.FC<Props> = (props) => {
  return (
    <a
      href={`https://buymeacoffee.com/${props.username}`}
      className={styles.button}
      title="Buy me a coffee"
    >
      <Icon variant="BUY_ME_A_COFFEE_WITH_TEXT" />
      <span className="codicon codicon-link-external"/>
    </a>
  )
}
