import { FC } from 'react'
import { CHATBOTS } from '@shared/constants/chatbots'
import { Field } from '@ui/components/editor/panel/Field'
import { PresetOption } from '@ui/components/editor/panel/PresetOption'
import styles from '../../../EditPresetForm/EditPresetForm.module.scss'
import { OptionsOverrideProps } from '../types'

export const ChatgptOptions: FC<OptionsOverrideProps> = ({
  options,
  new_url,
  on_option_toggle
}) => {
  const chatbot_config = CHATBOTS.ChatGPT
  const supported_options = chatbot_config.supported_options || {}

  return (
    <Field label="Options">
      <div className={styles.options}>
        {Object.entries(supported_options).map(([key, label]) => {
          const is_disabled =
            !!new_url && (key == 'temporary' || key == 'thinking')
          return (
            <PresetOption
              key={key}
              label={label as string}
              checked={options.includes(key)}
              on_change={() => on_option_toggle(key)}
              disabled={is_disabled}
              disabled_reason={
                is_disabled ? 'Unavailable when Project URL is set' : undefined
              }
            />
          )
        })}
      </div>
    </Field>
  )
}