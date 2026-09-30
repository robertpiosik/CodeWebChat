import * as vscode from 'vscode'
import { SettingsViewProvider } from '@/views/settings/backend/settings-view-provider'
import { CHATBOTS } from '@shared/constants/chatbots'
import { config_web_configuration_to_ui_format } from '@/utils/web-configuration-format-converters'

export const handle_get_web_configurations = async (
  settings_provider: SettingsViewProvider
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const web_configurations_config = config.get<any[]>('chatbots', []) || []

  settings_provider.postMessage({
    command: 'WEB_CONFIGURATIONS',
    web_configurations: web_configurations_config
      .filter(
        (c: any) => c.chatbot && CHATBOTS[c.chatbot as keyof typeof CHATBOTS]
      )
      .map((config: any) => {
        let model = config.model
        if (config.chatbot && model) {
          const chatbot_info = CHATBOTS[config.chatbot as keyof typeof CHATBOTS]
          const is_user_provided_supported =
            chatbot_info.supports_user_provided_model
          const is_model_predefined = chatbot_info.models?.[model]

          if (
            !is_user_provided_supported &&
            !is_model_predefined &&
            config.chatbot != 'OpenRouter'
          ) {
            model = undefined
          }
        }
        return config_web_configuration_to_ui_format({ ...config, model })
      }),
    defaults: {
      'code-at-cursor':
        web_configurations_config.find((c: any) => c.isDefaultForCodeAtCursor)
          ?.name || null,
      'intelligent-search':
        web_configurations_config.find(
          (c: any) => c.isDefaultForIntelligentSearch
        )?.name || null
    }
  })
}
