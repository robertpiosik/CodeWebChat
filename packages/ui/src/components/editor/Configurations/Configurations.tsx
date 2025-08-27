import styles from './Configurations.module.scss'
import { DEFAULT_TEMPERATURE } from '@shared/constants/api-tools'
import cn from 'classnames'
import { IconButton } from '../IconButton'

export namespace Configurations {
  export type Configuration = {
    model: string
    provider: string
    temperature?: number
    reasoning_effort?: string
    cache_enabled?: boolean
  }

  export type Props = {
    api_mode: 'edit-context' | 'code-completions'
    configurations: Configuration[]
    on_configuration_click: (i: number) => void
    on_manage_configurations: () => void
    has_instructions: boolean
    selected_configuration_index?: number
    has_active_editor: boolean
    has_active_selection: boolean
    has_context: boolean
    translations: {
      my_configurations: string
      add_files_to_context_first: string
      configuration_requires_active_editor: string
      configuration_cannot_be_used_with_selection: string
      manage_configurations: string
      missing_configuration_message: string
    }
  }
}

export const Configurations: React.FC<Configurations.Props> = (props) => {
  return (
    <div className={styles.container}>
      <div className={styles.heading}>
        <div className={styles['heading__title']}>
          {props.translations.my_configurations}
        </div>
        <IconButton
          codicon_icon="settings"
          on_click={props.on_manage_configurations}
        />
        {props.configurations.length == 0 && (
          <span
            className={`codicon codicon-arrow-left ${styles['arrow-animate']}`}
          />
        )}
      </div>

      {props.configurations.length == 0 && (
        <div className={styles['missing-config']}>
          {props.translations.missing_configuration_message}
        </div>
      )}

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
          if (configuration.cache_enabled) {
            description_parts.push('cache-enabled')
          }

          const description = description_parts.join(' · ')

          const is_item_disabled =
            (props.api_mode == 'edit-context' &&
              (!props.has_context || !props.has_instructions)) ||
            (props.api_mode == 'code-completions' &&
              (!props.has_active_editor || props.has_active_selection))

          return (
            <div
              key={i}
              className={cn(styles.configurations__item, {
                [styles['configurations__item--highlighted']]:
                  props.selected_configuration_index == i,
                [styles['configurations__item--disabled']]: is_item_disabled
              })}
              onClick={() => {
                if (!is_item_disabled) {
                  props.on_configuration_click(i)
                }
              }}
              role="button"
            >
              <div className={styles.configurations__item__left}>
                <span>{configuration.model}</span>
                <span>{description}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
