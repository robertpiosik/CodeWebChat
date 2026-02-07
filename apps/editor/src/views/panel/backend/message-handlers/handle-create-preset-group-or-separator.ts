import * as vscode from 'vscode'
import { PanelProvider } from '@/views/panel/backend/panel-provider'
import { dictionary } from '@shared/constants/dictionary'
import { CHATBOTS } from '@shared/constants/chatbots'
import {
  config_preset_to_ui_format,
  ConfigPresetFormat
} from '@/views/panel/backend/utils/preset-format-converters'
import { CreatePresetGroupOrSeparatorMessage } from '@/views/panel/types/messages'

const ITEM_NAME_GROUP = 'Group'
const ITEM_NAME_SEPARATOR = 'Separator'
const ITEM_NAME_PRESET = 'Preset'

const create_group = async (params: {
  panel_provider: PanelProvider
  insertion_index?: number
}) => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const presets_config_key = params.panel_provider.get_presets_config_key()
  const current_presets =
    config.get<ConfigPresetFormat[]>(presets_config_key, []) || []

  let new_name = ''
  let copy_number = 0
  while (new_name == '' || current_presets.some((p) => p.name == new_name)) {
    new_name = `(${copy_number++})`
  }

  const new_group = {
    name: new_name
  } as ConfigPresetFormat

  const updated_presets = [...current_presets]
  if (params.insertion_index !== undefined) {
    updated_presets.splice(params.insertion_index, 0, new_group)
  } else {
    updated_presets.push(new_group)
  }

  try {
    params.panel_provider.send_message({
      command: 'PRESET_CREATED',
      preset: config_preset_to_ui_format(new_group)
    })
    await config.update(presets_config_key, updated_presets, true)
  } catch (error) {
    vscode.window.showErrorMessage(
      dictionary.error_message.FAILED_TO_CREATE_ITEM(ITEM_NAME_GROUP, error)
    )
  }
}

const create_separator = async (params: {
  panel_provider: PanelProvider
  insertion_index?: number
}) => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const presets_config_key = params.panel_provider.get_presets_config_key()
  const current_presets =
    config.get<ConfigPresetFormat[]>(presets_config_key, []) || []

  const new_separator = {} as ConfigPresetFormat

  const updated_presets = [...current_presets]
  if (params.insertion_index !== undefined) {
    updated_presets.splice(params.insertion_index, 0, new_separator)
  } else {
    updated_presets.push(new_separator)
  }

  try {
    await config.update(presets_config_key, updated_presets, true)
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to create ${ITEM_NAME_SEPARATOR}`)
  }
}

const create_preset = async (params: {
  panel_provider: PanelProvider
  insertion_index?: number
}) => {
  const config = vscode.workspace.getConfiguration('codeWebChat')
  const presets_config_key = params.panel_provider.get_presets_config_key()
  const current_presets =
    config.get<ConfigPresetFormat[]>(presets_config_key, []) || []

  let copy_number = 0
  let new_name: string
  do {
    new_name = `(${copy_number++})`
  } while (current_presets.some((p) => p.name == new_name))

  const new_preset: ConfigPresetFormat = {
    name: new_name,
    chatbot: 'AI Studio',
    model: Object.keys(CHATBOTS['AI Studio'].models ?? {})[0],
    temperature: 0.5,
    systemInstructions: CHATBOTS['AI Studio'].default_system_instructions
  }

  const updated_presets = [...current_presets]
  if (params.insertion_index !== undefined) {
    updated_presets.splice(params.insertion_index, 0, new_preset)
  } else {
    const last_group_or_separator = [...current_presets]
      .reverse()
      .find((p) => (!p.chatbot && p.name) || !p.name)

    if (last_group_or_separator?.name && !last_group_or_separator.chatbot) {
      updated_presets.push({}, new_preset)
    } else {
      updated_presets.push(new_preset)
    }
  }

  try {
    params.panel_provider.send_message({
      command: 'PRESET_CREATED',
      preset: config_preset_to_ui_format(new_preset)
    })
    await config.update(presets_config_key, updated_presets, true)
  } catch (error) {
    vscode.window.showErrorMessage(
      dictionary.error_message.FAILED_TO_CREATE_ITEM(ITEM_NAME_PRESET, error)
    )
  }
}

export const handle_create_preset_group_or_separator = async (
  panel_provider: PanelProvider,
  message: CreatePresetGroupOrSeparatorMessage
): Promise<void> => {
  let insertion_index: number | undefined

  if (message.reference_index !== undefined) {
    const position_quick_pick = await new Promise<string | undefined>(
      (resolve) => {
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
      }
    )
    if (!position_quick_pick) return

    insertion_index =
      position_quick_pick == 'Insert a new item above'
        ? message.reference_index
        : message.reference_index + 1
  } else if (message.placement == 'top') {
    insertion_index = 0
  }

  const quickPick = vscode.window.createQuickPick()
  quickPick.items = [
    { label: ITEM_NAME_PRESET },
    { label: ITEM_NAME_GROUP },
    { label: ITEM_NAME_SEPARATOR }
  ]
  quickPick.title = 'Item Types'
  quickPick.placeholder = 'What would you like to create?'
  quickPick.buttons = [
    {
      iconPath: new vscode.ThemeIcon('close'),
      tooltip: 'Close'
    }
  ]

  quickPick.onDidTriggerButton(() => {
    quickPick.hide()
  })

  quickPick.onDidAccept(async () => {
    const selection = quickPick.selectedItems[0]?.label
    quickPick.hide()

    if (selection == ITEM_NAME_GROUP) {
      await create_group({ panel_provider, insertion_index })
    } else if (selection == ITEM_NAME_SEPARATOR) {
      await create_separator({ panel_provider, insertion_index })
    } else if (selection == ITEM_NAME_PRESET) {
      await create_preset({ panel_provider, insertion_index })
    }
  })

  quickPick.onDidHide(() => quickPick.dispose())
  quickPick.show()
}
