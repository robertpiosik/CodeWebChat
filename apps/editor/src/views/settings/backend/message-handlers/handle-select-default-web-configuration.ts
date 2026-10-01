import * as vscode from 'vscode'
import { SelectDefaultWebConfigurationMessage } from '@/views/settings/types/messages'
import { t } from '@/i18n'
import { CHATBOTS } from '@shared/constants/chatbots'

export const handle_select_default_web_configuration = async (
  message: SelectDefaultWebConfigurationMessage
): Promise<void> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const web_configs = config.get<any[]>('chatbots', []) || []
  if (web_configs.length === 0) return

  const items = web_configs.map((c) => {
    const is_unnamed =
      !c.name ||
      c.name.startsWith('unnamed-') ||
      /^\(\d+\)$/.test(c.name.trim())
    const display_name = is_unnamed
      ? c.chatbot!
      : c.name!.replace(/ \(\d+\)$/, '')

    const get_details = (): string[] => {
      const { chatbot, model, reasoningEffort } = c
      const model_display_name =
        model && chatbot && CHATBOTS[chatbot as keyof typeof CHATBOTS]
          ? CHATBOTS[chatbot as keyof typeof CHATBOTS].models?.[model]?.label ||
            model
          : null

      const details: string[] = []
      if (is_unnamed) {
        if (model_display_name) details.push(model_display_name)
      } else if (model_display_name) {
        details.push(chatbot!, model_display_name)
      } else if (chatbot) {
        details.push(chatbot)
      }

      if (reasoningEffort) {
        details.push(reasoningEffort)
      }

      return details
    }

    const description_parts = get_details()

    return {
      label: display_name,
      description:
        description_parts.length > 0 ? description_parts.join(' ') : undefined,
      web_configuration_name: c.name
    }
  })

  const quick_pick = vscode.window.createQuickPick<
    vscode.QuickPickItem & { web_configuration_name: string }
  >()
  quick_pick.items = items
  quick_pick.title = t('common.title.chatbots')
  quick_pick.placeholder = t('common.placeholder.select-chatbot')

  const close_button: vscode.QuickInputButton = {
    iconPath: new vscode.ThemeIcon('close'),
    tooltip: t('common.close')
  }
  quick_pick.buttons = [close_button]

  quick_pick.onDidTriggerButton((button) => {
    if (button === close_button) {
      quick_pick.hide()
    }
  })

  quick_pick.onDidAccept(async () => {
    const selected = quick_pick.selectedItems[0]
    quick_pick.hide()

    if (selected) {
      const updated = web_configs.map((c) => {
        const new_c = { ...c }
        if (message.web_feature == 'code-at-cursor') {
          if (c.name == selected.web_configuration_name) {
            new_c.isDefaultForCodeAtCursor = true
          } else {
            delete new_c.isDefaultForCodeAtCursor
          }
        } else if (message.web_feature == 'patch-repair') {
          if (c.name == selected.web_configuration_name) {
            new_c.isDefaultForPatchRepair = true
          } else {
            delete new_c.isDefaultForPatchRepair
          }
        } else if (message.web_feature == 'intelligent-search') {
          if (c.name == selected.web_configuration_name) {
            new_c.isDefaultForIntelligentSearch = true
          } else {
            delete new_c.isDefaultForIntelligentSearch
          }
        } else if (message.web_feature == 'commit-message') {
          if (c.name == selected.web_configuration_name) {
            new_c.isDefaultForCommitMessage = true
          } else {
            delete new_c.isDefaultForCommitMessage
          }
        }
        return new_c
      })
      await config.update(
        'chatbots',
        updated,
        vscode.ConfigurationTarget.Global
      )
    }
  })

  quick_pick.onDidHide(() => quick_pick.dispose())
  quick_pick.show()
}
