import * as vscode from 'vscode'
import { dictionary } from '@shared/constants/dictionary'
import { CHATBOTS } from '@shared/constants/chatbots'
import { WebConfiguration } from '@shared/types/web-configuration'
import {
  ConfigWebConfigurationFormat,
  ui_web_configuration_to_config_format
} from './web-configuration-format-converters'

export const upsert_web_configuration = async (params: {
  updating_web_configuration?: WebConfiguration
  updated_web_configuration?: WebConfiguration
  origin?: 'back_button' | 'save_button'
  placement?: 'top' | 'bottom'
  reference_index?: number
}): Promise<ConfigWebConfigurationFormat | undefined> => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const current_web_configurations =
    config.get<ConfigWebConfigurationFormat[]>('webConfigurations', []) || []

  // --- UPDATE LOGIC ---
  if (params.updating_web_configuration && params.updated_web_configuration) {
    const web_configuration_index = current_web_configurations.findIndex(
      (p) => p.name == params.updating_web_configuration!.name
    )

    if (web_configuration_index == -1) {
      console.error(
        `web configuration with original name "${params.updating_web_configuration.name}" not found.`
      )
      vscode.window.showErrorMessage(
        dictionary.error_message.COULD_NOT_UPDATE_ITEM_NOT_FOUND(
          'web configuration',
          params.updating_web_configuration.name!
        )
      )
        return undefined
    }

    const are_web_configurations_equal = (a: WebConfiguration, b: WebConfiguration): boolean => {
      return (
        a.name == b.name &&
        a.chatbot == b.chatbot &&
        a.model == b.model &&
        a.temperature === b.temperature &&
        a.top_p === b.top_p &&
        a.thinking_budget === b.thinking_budget &&
        a.reasoning_effort == b.reasoning_effort &&
        a.system_instructions == b.system_instructions &&
        JSON.stringify(a.options) == JSON.stringify(b.options) &&
        a.port == b.port &&
        a.new_url == b.new_url &&
        a.is_pinned == b.is_pinned
      )
    }

    const final_updated_web_configuration = { ...params.updated_web_configuration }

    const has_changes = !are_web_configurations_equal(
      params.updating_web_configuration,
      final_updated_web_configuration
    )

    if (!has_changes) {
        return undefined
    }

    if (params.origin == 'back_button') {
      const save_changes_button = 'Save'
      const discard_changes = 'Discard changes'
      const result = await vscode.window.showInformationMessage(
        dictionary.information_message.CONFIRM_SAVE_CHANGES_TO_ITEM('web configuration'),
        {
          modal: true,
          detail: dictionary.information_message.UNSAVED_CHANGES_TO_ITEM_WILL_BE_LOST(
            'web configuration'
          )
        },
        save_changes_button,
        discard_changes
      )

      if (result == discard_changes) {
          return undefined
      }

      if (result != save_changes_button) {
          return undefined
      }
    }

    const updated_ui_web_configuration = { ...final_updated_web_configuration }
    if (!updated_ui_web_configuration.name || !updated_ui_web_configuration.name.trim()) {
      let counter = 1
      while (true) {
        const candidate = `(${counter})`
        const conflict = current_web_configurations.some(
          (p, index) => index != web_configuration_index && p.name == candidate
        )
        if (!conflict) {
          updated_ui_web_configuration.name = candidate
          break
        }
        counter++
      }
    }

    if (updated_ui_web_configuration.name) {
      let final_name = updated_ui_web_configuration.name.trim()

      let is_unique = false
      let copy_number = 0
      const base_name = final_name

      while (!is_unique) {
        const name_to_check =
          copy_number == 0 ? base_name : `${base_name} (${copy_number})`.trim()

        const conflict = current_web_configurations.some(
          (p, index) => index != web_configuration_index && p.name == name_to_check
        )

        if (!conflict) {
          final_name = name_to_check
          is_unique = true
        } else {
          copy_number++
        }
      }

      if (final_name != updated_ui_web_configuration.name) {
        updated_ui_web_configuration.name = final_name
      }
    }

    const updated_web_configurations = [...current_web_configurations]
    updated_web_configurations[web_configuration_index] = ui_web_configuration_to_config_format(
      updated_ui_web_configuration
    )

    await config.update(
      'webConfigurations',
      updated_web_configurations,
      vscode.ConfigurationTarget.Global
    )

      return undefined
  }

  // --- CREATE LOGIC ---
  let insertion_index: number | undefined

  if (params.reference_index !== undefined) {
    const position_quick_pick = await new Promise<string | undefined>((resolve) => {
      const quick_pick = vscode.window.createQuickPick()
      quick_pick.items = [
        { label: 'Insert a new item above' },
        { label: 'Insert a new item below' }
      ]
      quick_pick.title = 'Placement'
      quick_pick.placeholder = 'Where to insert?'
      quick_pick.buttons = [
        {
          iconPath: new vscode.ThemeIcon('close'),
          tooltip: 'Close'
        }
      ]

      let accepted = false
      const disposables: vscode.Disposable[] = []

      disposables.push(
        quick_pick.onDidTriggerButton(() => {
          quick_pick.hide()
        }),
        quick_pick.onDidAccept(() => {
          accepted = true
          resolve(quick_pick.selectedItems[0]?.label)
          quick_pick.hide()
        }),
        quick_pick.onDidHide(() => {
          if (!accepted) resolve(undefined)
          disposables.forEach((d) => d.dispose())
          quick_pick.dispose()
        })
      )

      quick_pick.show()
    })

    if (!position_quick_pick) return undefined

    insertion_index =
      position_quick_pick == 'Insert a new item above'
        ? params.reference_index
        : params.reference_index + 1
  } else if (params.placement == 'top') {
    insertion_index = 0
  }

  const selected_chatbot = await new Promise<keyof typeof CHATBOTS | undefined>((resolve) => {
    const chatbots = Object.entries(CHATBOTS)
    const items: vscode.QuickPickItem[] = chatbots.map(([chatbot, { url }]) => ({
      label: chatbot,
      description:
        chatbot == 'Open WebUI' ? 'localhost' : url.replace(/^https?:\/\//, '').split('/')[0]
    }))

    const quick_pick = vscode.window.createQuickPick()
    quick_pick.items = items
    quick_pick.title = 'Chatbots'
    quick_pick.placeholder = 'Choose a chatbot for the new web configuration'
    quick_pick.buttons = [
      {
        iconPath: new vscode.ThemeIcon('close'),
        tooltip: 'Close'
      }
    ]

    let accepted = false
    const disposables: vscode.Disposable[] = []

    disposables.push(
      quick_pick.onDidTriggerButton(() => {
        quick_pick.hide()
      }),
      quick_pick.onDidAccept(() => {
        accepted = true
        const chatbot = quick_pick.selectedItems[0]?.label as keyof typeof CHATBOTS
        quick_pick.hide()
        resolve(chatbot)
      }),
      quick_pick.onDidHide(() => {
        if (!accepted) resolve(undefined)
        disposables.forEach((d) => d.dispose())
        quick_pick.dispose()
      })
    )

    quick_pick.show()
  })

  if (!selected_chatbot) return undefined

  let copy_number = 0
  let new_name: string
  do {
    new_name = `(${copy_number++})`
  } while (current_web_configurations.some((p) => p.name == new_name))

  const new_web_configuration: ConfigWebConfigurationFormat = {
    name: new_name,
    chatbot: selected_chatbot,
    model: Object.keys(CHATBOTS[selected_chatbot].models ?? {})[0],
    systemInstructions: CHATBOTS[selected_chatbot].supports_system_instructions
      ? CHATBOTS[selected_chatbot].default_system_instructions
      : undefined
  }

  const updated_web_configurations = [...current_web_configurations]
  if (insertion_index !== undefined) {
    updated_web_configurations.splice(insertion_index, 0, new_web_configuration)
  } else {
    updated_web_configurations.push(new_web_configuration)
  }

  try {
    await config.update('webConfigurations', updated_web_configurations, true)
    return new_web_configuration
  } catch (error) {
    vscode.window.showErrorMessage(
      dictionary.error_message.FAILED_TO_CREATE_ITEM('Web Configuration', error)
    )
    return undefined
  }
}
