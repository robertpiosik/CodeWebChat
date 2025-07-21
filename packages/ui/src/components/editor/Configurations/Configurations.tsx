import styles from './Configurations.module.scss'
import { Button } from '../Button/Button'
import cn from 'classnames'

export namespace Configurations {
  export type Configuration = {
    model: string
    provider: string
    temperature?: number
    reasoning_effort?: string
  }

  export type Props = {
    configurations: Configuration[]
    is_disabled: boolean
    on_configuration_click: (configuration: Configuration) => void
    on_manage_configurations: () => void
  }
}

export const Configurations: React.FC<Configurations.Props> = (props) => {
  return (
    <div
      className={cn(styles.container, {
        [styles['container--disabled']]: props.is_disabled
      })}
    >
      <div className={styles['my-configurations']}>MY CONFIGURATIONS</div>

      <div className={styles.configurations}>
        {props.configurations.map((configuration, i) => {
          return (
            <div
              key={i}
              className={styles.configurations__item}
              onClick={() => {
                props.on_configuration_click(configuration)
              }}
              role="button"
            >
              <div className={styles.configurations__item__left}>
                <div className={styles.configurations__item__left__text}>
                  <span>{configuration.model}</span>
                  <span>{configuration.provider}</span>
                </div>
              </div>
              <div
                className={styles.configurations__item__right}
                onClick={(e) => {
                  e.stopPropagation()
                }}
              ></div>
            </div>
          )
        })}
      </div>

      <div className={styles.configurations__create}>
        <Button on_click={props.on_manage_configurations}>
          Manage configurations
        </Button>
      </div>
    </div>
  )
}
