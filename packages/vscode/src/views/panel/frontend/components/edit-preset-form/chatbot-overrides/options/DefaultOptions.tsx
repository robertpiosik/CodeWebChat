import { FC } from 'react'
import { CHATBOTS } from '@shared/constants/chatbots'
import { Field } from '@ui/components/editor/panel/Field'
import { PresetOption } from '@ui/components/editor/panel/PresetOption'
import styles from '../../EditPresetForm/EditPresetForm.module.scss'
import { OptionsOverrideProps } from './types'

export const DefaultOptions: FC<OptionsOverrideProps> = ({
  chatbot,
  model,
  options,
  on_option_toggle
}) => {
  if (!chatbot) return null

  const chatbot_config = CHATBOTS[chatbot]
  const supported_options = chatbot_config.supported_options || {}
  const models = chatbot_config.models || {}

  if (Object.keys(supported_options).length === 0) {
    return null
  }

  const model_info = model ? (models as any)[model] : undefined

  return (
    <Field label="Options">
      <div className={styles.options}>
        {Object.entries(supported_options).map(([key, label]) => {
          if (model_info?.disabled_options?.includes(key)) {
            return null
          }
          return (
            <PresetOption
              key={key}
              label={label as string}
              checked={options.includes(key)}
              on_change={() => on_option_toggle(key)}
            />
          )
        })}
      </div>
    </Field>
  )
}