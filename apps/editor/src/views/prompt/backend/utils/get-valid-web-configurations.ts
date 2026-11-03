import {
  config_web_configuration_to_ui_format,
  ConfigWebConfigurationFormat
} from '@/utils/web-configuration-format-converters'
import { CHATBOTS } from '@shared/constants/chatbots'

export const get_valid_web_configurations = (
  web_configurations_config: ConfigWebConfigurationFormat[]
) => {
  return web_configurations_config
    .filter((config) => config.chatbot && CHATBOTS[config.chatbot])
    .map((config) => {
      let model = config.model
      if (config.chatbot && model) {
        const chatbot_info = CHATBOTS[config.chatbot]
        const is_user_provided_supported =
          chatbot_info.supports_user_provided_model
        const is_model_predefined = chatbot_info.models?.[model]

        if (
          !is_user_provided_supported &&
          !is_model_predefined &&
          config.chatbot !== 'OpenRouter'
        ) {
          model = undefined
        }
      }
      return config_web_configuration_to_ui_format({ ...config, model })
    })
}
