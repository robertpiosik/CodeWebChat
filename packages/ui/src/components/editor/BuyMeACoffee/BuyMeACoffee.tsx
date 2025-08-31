import React from 'react'
import styles from './BuyMeACoffee.module.scss'
import { Icon } from '../Icon'

export type BuyMeACoffeeProps = {
  username: string
  supporter_name?: string
  support_coffees?: number
  support_note?: string
}

export const BuyMeACoffee: React.FC<BuyMeACoffeeProps> = (props) => {
  if (props.supporter_name && props.support_coffees) {
    return (
      <div className={styles.donations}>
        <a
          href={`https://buymeacoffee.com/${props.username}`}
          className={styles.button}
          title="Buy me a coffee"
        >
          <Icon variant="BUY_ME_A_COFFEE_WITH_TEXT" />
          <span className="codicon codicon-link-external" />
        </a>
        <div className={styles.donations__donation}>
          <div
            className={styles.donations__donation__header}
            title={`${props.supporter_name} bought ${
              props.support_coffees
            } coffee${props.support_coffees > 1 ? 's' : ''}`}
          >
            <strong>{props.supporter_name}</strong> bought{' '}
            {props.support_coffees} coffee
            {props.support_coffees > 1 && 's'}
          </div>
          {props.support_note && (
            <div className={styles.donations__donation__note}>
              {props.support_note}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <a
      href={`https://buymeacoffee.com/${props.username}`}
      className={styles.button}
      title="Buy me a coffee"
    >
      <Icon variant="BUY_ME_A_COFFEE_WITH_TEXT" />
      <span className="codicon codicon-link-external" />
    </a>
  )
}
