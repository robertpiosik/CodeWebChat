import styles from './BuyMeACoffeeButton.module.scss'
import { Icon } from '../Icon'

export type BuyMeACoffeeButtonProps = {
  username: string
}

export const BuyMeACoffeeButton: React.FC<BuyMeACoffeeButtonProps> = (
  props
) => {
  return (
    <a
      href={`https://buymeacoffee.com/${props.username}`}
      className={styles.button}
      title="Support author with a donation"
    >
      <Icon variant="BUY_ME_A_COFFEE_WITH_TEXT" />
      <span className="codicon codicon-link-external" />
    </a>
  )
}
