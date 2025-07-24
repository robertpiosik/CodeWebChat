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
    on_configuration_click: (i: number) => void
    on_manage_configurations: () => void
    has_instructions: boolean
    has_active_editor: boolean
    has_active_selection: boolean
    has_context: boolean
    translations: {
      my_configurations: string
      add_files_to_context_first: string
      configuration_requires_active_editor: string
      configuration_cannot_be_used_with_selection: string
      manage_configurations: string
    }
  }
}

export const Configurations: React.FC<Configurations.Props> = (props) => {
  const is_in_code_completions_mode = props.api_mode == 'code-completions'

  return (
    <div className={styles.container}>
      <div className={styles['my-configurations']}>
        {props.translations.my_configurations}
      </div>

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

          const is_item_disabled =
            (props.api_mode == 'edit-context' &&
              (!props.has_context || !props.has_instructions)) ||
            (is_in_code_completions_mode &&
              (!props.has_active_editor || props.has_active_selection))

          const base_title = `${configuration.model} ${description}`
          const get_title = () => {
            if (props.api_mode == 'edit-context' && !props.has_context) {
              return props.translations.add_files_to_context_first
            }
            if (is_in_code_completions_mode) {
              if (!props.has_active_editor) {
                return props.translations.configuration_requires_active_editor
              }
              if (props.has_active_selection) {
                return props.translations
                  .configuration_cannot_be_used_with_selection
              }
            }
            return base_title
          }

          return (
            <div
              key={i}
              className={cn(styles.configurations__item, {
                [styles['configurations__item--disabled']]: is_item_disabled
              })}
              onClick={() => {
                if (!is_item_disabled) {
                  props.on_configuration_click(i)
                }
              }}
              role="button"
              title={get_title()}
            >
              <div className={styles.configurations__item__left}>
                <div className={styles.configurations__item__left__text}>
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
          {props.translations.manage_configurations}
        </Button>
      </div>
    </div>
  )
}
