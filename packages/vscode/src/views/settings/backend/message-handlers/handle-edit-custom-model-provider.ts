import * as vscode from 'vscode'
import axios from 'axios'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import {
  ModelProvidersManager,
  CustomProvider
} from '@/services/model-providers-manager'
import { dictionary } from '@shared/constants/dictionary'
import { EditCustomModelProviderMessage } from '@/views/settings/types/messages'
import { handle_get_model_providers } from './handle-get-model-providers'

const normalize_base_url = (url: string): string => {
  return url.trim().replace(/\/+$/, '')
}

export const handle_edit_custom_model_provider = async (
  provider: SettingsProvider,
  message: EditCustomModelProviderMessage
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(provider.context)
  const provider_name = message.provider_name

  const original_provider = (await providers_manager.get_providers()).find(
    (p) => p.name == provider_name && p.type == 'custom'
  ) as CustomProvider

  if (!original_provider) {
    vscode.window.showErrorMessage(
      dictionary.error_message.MODEL_PROVIDER_NOT_FOUND_BY_NAME(provider_name)
    )
    return
  }

  let provider_to_edit: CustomProvider = { ...original_provider }

  const show_options_quick_pick = (): Promise<string | undefined> => {
    return new Promise((resolve) => {
      const items: { label: string; id: string; detail: string }[] = [
        {
          label: 'Name',
          id: 'rename',
          detail: provider_to_edit.name
        },
        {
          label: 'Base URL',
          id: 'edit-url',
          detail: provider_to_edit.base_url
        },
        {
          label: 'API key',
          id: 'change-key',
          detail: provider_to_edit.api_key
            ? `...${provider_to_edit.api_key.slice(-4)}`
            : 'Not set'
        }
      ]

      const quick_pick = vscode.window.createQuickPick()
      quick_pick.items = items
      quick_pick.title = `Edit "${provider_to_edit.name}" Model Provider`

      const redo_button: vscode.QuickInputButton = {
        iconPath: new vscode.ThemeIcon('redo'),
        tooltip: 'Cancel all changes'
      }

      const save_button: vscode.QuickInputButton = {
        iconPath: new vscode.ThemeIcon('save'),
        tooltip: 'Save changes'
      }

      quick_pick.buttons = [redo_button, save_button]

      let is_accepted = false
      const disposables: vscode.Disposable[] = []

      const cleanup = () => {
        disposables.forEach((d) => d.dispose())
        quick_pick.dispose()
      }

      disposables.push(
        quick_pick.onDidTriggerButton((button) => {
          is_accepted = true
          if (button === redo_button) {
            resolve('redo')
          } else if (button === save_button) {
            resolve('save')
          }
          quick_pick.hide()
        }),
        quick_pick.onDidAccept(() => {
          is_accepted = true
          const selected = quick_pick.selectedItems[0] as
            | (typeof items)[0]
            | undefined
          resolve(selected?.id)
          quick_pick.hide()
        }),
        quick_pick.onDidHide(() => {
          if (!is_accepted) {
            resolve(undefined)
          }
          cleanup()
        })
      )

      quick_pick.show()
    })
  }

  const prompt_for_name = (): Promise<string> => {
    return new Promise((resolve) => {
      const input_box = vscode.window.createInputBox()
      input_box.title = 'Edit Name'
      input_box.prompt = 'Enter a new name for the custom model provider'
      input_box.value = provider_to_edit.name
      input_box.valueSelection = [0, input_box.value.length]

      let is_accepted = false
      const disposables: vscode.Disposable[] = []

      const cleanup = () => {
        disposables.forEach((d) => d.dispose())
        input_box.dispose()
      }

      disposables.push(
        input_box.onDidAccept(async () => {
          const new_name = input_box.value

          if (!new_name.trim()) {
            input_box.validationMessage = 'Name is required'
            return
          }
          if (
            (await providers_manager.get_providers()).some(
              (p) =>
                p.type == 'custom' &&
                p.name == new_name.trim() &&
                p.name != original_provider.name
            )
          ) {
            input_box.validationMessage =
              'A provider with this name already exists'
            return
          }

          is_accepted = true
          cleanup()
          resolve(new_name)
        }),
        input_box.onDidHide(() => {
          if (!is_accepted) {
            // Escaped, cancel changes
            resolve(provider_to_edit.name)
            cleanup()
          }
        })
      )

      input_box.show()
    })
  }

  const prompt_for_url = (): Promise<string> => {
    return new Promise((resolve) => {
      const input_box = vscode.window.createInputBox()
      input_box.title = 'Edit Base URL'
      input_box.prompt = 'Enter the new base URL'
      input_box.value = provider_to_edit.base_url
      input_box.valueSelection = [0, input_box.value.length]

      let is_accepted = false
      const disposables: vscode.Disposable[] = []

      const cleanup = () => {
        disposables.forEach((d) => d.dispose())
        input_box.dispose()
      }

      disposables.push(
        input_box.onDidAccept(async () => {
          is_accepted = true
          const new_base_url = input_box.value
          cleanup()
          resolve(new_base_url)
        }),
        input_box.onDidHide(() => {
          if (!is_accepted) {
            resolve(provider_to_edit.base_url)
            cleanup()
          }
        })
      )
      input_box.show()
    })
  }

  const prompt_for_key = (): Promise<{
    value: string
    accepted: boolean
  }> => {
    return new Promise((resolve) => {
      const input_box = vscode.window.createInputBox()
      input_box.title = `API Key for ${provider_to_edit.name}`
      input_box.prompt = 'Enter your API key.'
      input_box.password = true
      input_box.placeholder = provider_to_edit.api_key
        ? `...${provider_to_edit.api_key.slice(-4)}`
        : 'No API key set'

      let is_accepted = false
      const disposables: vscode.Disposable[] = []

      const cleanup = () => {
        disposables.forEach((d) => d.dispose())
        input_box.dispose()
      }

      disposables.push(
        input_box.onDidAccept(async () => {
          is_accepted = true
          resolve({ value: input_box.value, accepted: true })
          cleanup()
        }),
        input_box.onDidHide(() => {
          if (!is_accepted) {
            resolve({ value: input_box.value, accepted: false })
            cleanup()
          }
        })
      )
      input_box.show()
    })
  }

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const selected_id = await show_options_quick_pick()

    if (selected_id === undefined || selected_id == 'save') {
      break
    }

    if (selected_id == 'redo') {
      provider_to_edit = { ...original_provider }
      continue
    }

    if (selected_id == 'rename') {
      const new_name = await prompt_for_name()
      const trimmed_new_name = new_name.trim()
      if (trimmed_new_name && trimmed_new_name !== provider_to_edit.name) {
        provider_to_edit.name = trimmed_new_name
      }
    } else if (selected_id == 'edit-url') {
      const new_url = await prompt_for_url()
      const normalized_new_url = normalize_base_url(new_url)
      if (normalized_new_url !== provider_to_edit.base_url) {
        provider_to_edit.base_url = normalized_new_url
      }
    } else if (selected_id == 'change-key') {
      const current_api_key = provider_to_edit.api_key
      const { value: new_key, accepted } = await prompt_for_key()
      if (!accepted) {
        continue
      }
      const trimmed_api_key = new_key.trim()
      if (trimmed_api_key === current_api_key) {
        continue
      }
      if (trimmed_api_key === '' && current_api_key) {
        const confirmation = await vscode.window.showWarningMessage(
          dictionary.warning_message.CONFIRM_CLEAR_API_KEY(
            provider_to_edit.name
          ),
          { modal: true },
          'Clear API Key'
        )
        if (confirmation !== 'Clear API Key') {
          continue
        }
      }
      provider_to_edit.api_key = trimmed_api_key
    }
  }

  if (
    provider_to_edit.base_url != original_provider.base_url &&
    !provider_to_edit.base_url.endsWith('/v1')
  ) {
    let should_ask_to_add_v1 = true
    try {
      const headers: { [key: string]: string } = {}
      if (provider_to_edit.api_key) {
        headers['Authorization'] = `Bearer ${provider_to_edit.api_key}`
      }
      await axios.get(`${provider_to_edit.base_url}/models`, {
        timeout: 2000,
        headers
      })
      should_ask_to_add_v1 = false
    } catch (error) {
      // If the request fails, we should ask the user to add /v1.
    }

    if (should_ask_to_add_v1) {
      const add_v1_suffix = 'Add "/v1" suffix'
      const choice = await vscode.window.showInformationMessage(
        dictionary.information_message.BASE_URL_DOES_NOT_END_WITH_V1,
        { modal: true },
        add_v1_suffix
      )

      if (choice == add_v1_suffix) {
        provider_to_edit.base_url = `${provider_to_edit.base_url}/v1`
      }
    }
  }

  const has_changed =
    JSON.stringify(provider_to_edit) != JSON.stringify(original_provider)

  if (has_changed) {
    const providers = await providers_manager.get_providers()
    const updated_providers = providers.map((p) =>
      p.name == original_provider.name && p.type == 'custom'
        ? provider_to_edit
        : p
    )
    await providers_manager.save_providers(updated_providers)
    if (provider_to_edit.name != original_provider.name) {
      await providers_manager.update_provider_name_in_configs({
        old_name: original_provider.name,
        new_name: provider_to_edit.name
      })
    }
    await handle_get_model_providers(provider)
  }
}
