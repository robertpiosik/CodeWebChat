import styles from './HomeLinkButton.module.scss'
import { Icon } from '../Icon'

export type HomeLinkButtonProps = {
  url: string
  background_color: string
  fill_color: string
  logo_icon: Icon.Variant
  text_icon: Icon.Variant
  label: string
}

export const HomeLinkButton: React.FC<HomeLinkButtonProps> = (props) => {
  return (
    <a
      href={props.url}
      className={styles.button}
      style={{
        backgroundColor: props.background_color,
        color: props.fill_color
      }}
      title={props.url}
    >
      <div className={styles.left}>
        <div className={styles.left__logo}>
          <Icon variant={props.logo_icon} />
        </div>

        <Icon variant={props.text_icon} />
      </div>
      <div className={styles.right}>
        <span>{props.label}</span>
        <span className="codicon codicon-link-external" />
      </div>
    </a>
  )
}
