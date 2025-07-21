import styles from './Configurations.module.scss'
import { Button } from '../Button/Button'
import { DEFAULT_TEMPERATURE } from '@shared/constants/api-tools'
import cn from 'classnames'

export namespace Configurations {
  export type Configuration = {
    model: string
    provider: string
    temperature?: number
    reasoning_effort?: string
  }

  export type Props = {
    api_mode: 'edit-context' | 'code-completions'
    configurations: Configuration[]
    is_disabled: boolean
    on_configuration_click: (i: number) => void
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
          const description_parts = [configuration.provider]
          if (configuration.reasoning_effort) {
            description_parts.push(`${configuration.reasoning_effort}`)
          }
          if (
            configuration.temperature &&
            configuration.temperature != DEFAULT_TEMPERATURE[props.api_mode]
          ) {
            description_parts.push(`${configuration.temperature}`)
          }

          const description = description_parts.join(' · ')

          return (
            <div
              key={i}
              className={styles.configurations__item}
              onClick={() => {
                props.on_configuration_click(i)
              }}
              role="button"
            >
              <div className={styles.configurations__item__left}>
                <div
                  className={styles.configurations__item__left__text}
                  title={`${configuration.model} ${description}`}
                >
                  <span>{configuration.model}</span>
                  <span>{description}</span>
                </div>
              </div>
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
