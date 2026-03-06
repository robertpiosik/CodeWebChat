import * as vscode from 'vscode'
import axios from 'axios'
import {
  ModelProvidersManager,
  Provider
} from '@/services/model-providers-manager'
import { dictionary } from '@shared/constants/dictionary'
import { PROVIDERS } from '@/constants/providers'

const normalize_base_url = (url: string): string => {
  return url.trim().replace(/\/+$/, '')
}

export const upsert_model_provider = async (params: {
  context: vscode.ExtensionContext
  provider_name?: string
  insertion_index?: number
  create_on_top?: boolean
  show_back_button?: boolean
}): Promise<Provider | undefined> => {
  const providers_manager = new ModelProvidersManager(params.context)

  const prompt_for_name = async (params: {
    current_name: string
    is_creation: boolean
    show_back?: boolean
  }): Promise<string | undefined | 'BACK'> => {
    return new Promise((resolve) => {
      const input_box = vscode.window.createInputBox()
      input_box.ignoreFocusOut = true
      input_box.title = params.is_creation ? 'Name' : 'Edit Name'
      input_box.prompt = 'Name of the custom model provider.'
      input_box.value = params.current_name
      if (!params.is_creation) {
        input_box.valueSelection = [0, input_box.value.length]
      }

      if (params.show_back) {
        input_box.buttons = [vscode.QuickInputButtons.Back]
      }

      let is_accepted = false
      const disposables: vscode.Disposable[] = []

      const cleanup = () => {
        disposables.forEach((d) => d.dispose())
        input_box.dispose()
      }

      disposables.push(
        input_box.onDidTriggerButton((button) => {
          if (button === vscode.QuickInputButtons.Back) {
            is_accepted = true
            cleanup()
            resolve('BACK')
          }
        }),
        input_box.onDidAccept(() => {
          const new_name = input_box.value.trim()

          if (!new_name) {
            input_box.validationMessage = 'Name is required'
            return
          }

          is_accepted = true
          cleanup()
          resolve(new_name)
        }),
        input_box.onDidHide(() => {
          if (!is_accepted) {
            resolve(params.show_back ? 'BACK' : undefined)
            cleanup()
          }
        })
      )

      input_box.show()
    })
  }

  const prompt_for_url = (params: {
    current_url: string
    show_back?: boolean
    is_required?: boolean
  }): Promise<string | undefined | 'BACK'> => {
    return new Promise((resolve) => {
      const input_box = vscode.window.createInputBox()
      input_box.ignoreFocusOut = true
      input_box.title = 'Edit Base URL'
      input_box.prompt = 'Enter the base URL.'
      input_box.value = params.current_url
      input_box.valueSelection = [0, input_box.value.length]
      if (params.show_back) {
        input_box.buttons = [vscode.QuickInputButtons.Back]
      }

      let is_accepted = false
      const disposables: vscode.Disposable[] = []

      const cleanup = () => {
        disposables.forEach((d) => d.dispose())
        input_box.dispose()
      }

      disposables.push(
        input_box.onDidTriggerButton((button) => {
          if (button === vscode.QuickInputButtons.Back) {
            is_accepted = true
            cleanup()
            resolve('BACK')
          }
        }),
        input_box.onDidAccept(() => {
          const new_url = input_box.value.trim()

          if (params.is_required && !new_url) {
            input_box.validationMessage = 'Base URL is required'
            return
          }

          is_accepted = true
          cleanup()
          resolve(new_url)
        }),
        input_box.onDidHide(() => {
          if (!is_accepted) {
            resolve(params.show_back ? 'BACK' : undefined)
            cleanup()
          }
        })
      )
      input_box.show()
    })
  }

  const prompt_for_key = (
    current_key: string,
    show_back = false
  ): Promise<{ value: string; accepted: boolean; back?: boolean }> => {
    return new Promise((resolve) => {
      const input_box = vscode.window.createInputBox()
      input_box.ignoreFocusOut = true
      input_box.title = 'API Key'
      input_box.prompt = 'Enter your API key.'
      input_box.password = true
      input_box.placeholder = current_key ? `...${current_key.slice(-4)}` : ''

      if (show_back) {
        input_box.buttons = [vscode.QuickInputButtons.Back]
      }

      let is_accepted = false
      const disposables: vscode.Disposable[] = []

      const cleanup = () => {
        disposables.forEach((d) => d.dispose())
        input_box.dispose()
      }

      disposables.push(
        input_box.onDidTriggerButton((button) => {
          if (button === vscode.QuickInputButtons.Back) {
            is_accepted = true
            resolve({ value: input_box.value, accepted: false, back: true })
            cleanup()
          }
        }),
        input_box.onDidAccept(() => {
          is_accepted = true
          resolve({ value: input_box.value, accepted: true })
          cleanup()
        }),
        input_box.onDidHide(() => {
          if (!is_accepted) {
            resolve({
              value: input_box.value,
              accepted: false,
              back: show_back
            })
            cleanup()
          }
        })
      )
      input_box.show()
    })
  }

  const run_edit_loop = async (provider_to_edit: Provider): Promise<void> => {
    while (true) {
      const items: (vscode.QuickPickItem & { id: string })[] = [
        {
          label: 'Name',
          id: 'rename',
          detail: provider_to_edit.name
        },
        {
          label: 'Base URL',
          id: 'edit-url',
          description: provider_to_edit.base_url ? undefined : '⚠ Not set',
          detail: provider_to_edit.base_url
        },
        {
          label: 'API key',
          id: 'change-key',
          description: provider_to_edit.api_key ? undefined : 'Not set',
          detail: provider_to_edit.api_key
            ? `...${provider_to_edit.api_key.slice(-4)}`
            : undefined
        }
      ]

      const quick_pick = vscode.window.createQuickPick()
      quick_pick.items = items
      quick_pick.title = 'Edit Model Provider'
      quick_pick.placeholder = 'Select a property to edit'

      const close_button: vscode.QuickInputButton = {
        iconPath: new vscode.ThemeIcon('save'),
        tooltip: 'Save and close'
      }
      quick_pick.buttons = [close_button]

      const selected_id = await new Promise<string | undefined>((resolve) => {
        let is_accepted = false
        quick_pick.onDidAccept(() => {
          is_accepted = true
          const selected = quick_pick.selectedItems[0] as
            | (typeof items)[0]
            | undefined
          resolve(selected?.id)
          quick_pick.hide()
        })
        quick_pick.onDidTriggerButton((button) => {
          if (button === close_button) {
            quick_pick.hide()
          }
        })
        quick_pick.onDidHide(() => {
          if (!is_accepted) {
            resolve(undefined)
          }
          quick_pick.dispose()
        })
        quick_pick.show()
      })

      if (selected_id === undefined) {
        break // User closed the menu
      }

      if (selected_id == 'rename') {
        const new_name = await prompt_for_name({
          current_name: provider_to_edit.name,
          is_creation: false,
          show_back: true
        })
        if (new_name == 'BACK') continue
        if (new_name && new_name != provider_to_edit.name) {
          provider_to_edit.name = new_name
        }
      } else if (selected_id == 'edit-url') {
        const new_url = await prompt_for_url({
          current_url: provider_to_edit.base_url,
          show_back: true,
          is_required: true
        })
        if (new_url == 'BACK') continue
        if (new_url !== undefined) {
          provider_to_edit.base_url = normalize_base_url(new_url)
        }
      } else if (selected_id == 'change-key') {
        const {
          value: new_key,
          accepted,
          back
        } = await prompt_for_key(provider_to_edit.api_key, true)
        if (back) continue
        if (accepted) {
          const trimmed_key = new_key.trim()
          if (trimmed_key !== provider_to_edit.api_key) {
            if (trimmed_key == '' && provider_to_edit.api_key) {
              const confirmation = await vscode.window.showWarningMessage(
                dictionary.warning_message.CONFIRM_CLEAR_API_KEY(
                  provider_to_edit.name
                ),
                { modal: true },
                'Clear API Key'
              )
              if (confirmation == 'Clear API Key') {
                provider_to_edit.api_key = ''
              }
            } else {
              provider_to_edit.api_key = trimmed_key
            }
          }
        }
      }
    }
  }

  let actual_insertion_index: number | undefined

  if (params.insertion_index !== undefined) {
    const position_quick_pick = await new Promise<string | undefined>(
      (resolve) => {
        const quick_pick = vscode.window.createQuickPick()
        quick_pick.items = [
          { label: 'Insert a new provider above' },
          { label: 'Insert a new provider below' }
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

    actual_insertion_index =
      position_quick_pick == 'Insert a new provider above'
        ? params.insertion_index
        : params.insertion_index + 1
  }

  let working_provider: Provider | undefined
  let original_name: string | undefined

  if (params.provider_name) {
    const existing = await providers_manager.get_provider(params.provider_name)
    if (!existing) {
      vscode.window.showErrorMessage(
        dictionary.error_message.MODEL_PROVIDER_NOT_FOUND_BY_NAME(
          params.provider_name
        )
      )
      return
    }
    working_provider = { ...existing }
    original_name = existing.name
  } else {
    const show_add_options = async (): Promise<{
      id?: string
    } | null> => {
      const custom_label = '$(edit) Custom endpoint...'
      const available_built_in = Object.entries(PROVIDERS)

      const items: vscode.QuickPickItem[] = [
        {
          label: custom_label,
          description: 'You can use any OpenAI-API compatible provider'
        },
        {
          label: 'predefined endpoints',
          kind: vscode.QuickPickItemKind.Separator
        },
        ...available_built_in.map(([id, info]) => ({
          label: id,
          detail: info.base_url
        }))
      ]

      const quick_pick = vscode.window.createQuickPick()
      quick_pick.items = items
      quick_pick.title = 'Model Providers'
      quick_pick.placeholder =
        'Choose a predefined provider or add a custom endpoint'

      const close_button: vscode.QuickInputButton = {
        iconPath: new vscode.ThemeIcon('close'),
        tooltip: 'Close'
      }

      if (params.show_back_button) {
        quick_pick.buttons = [vscode.QuickInputButtons.Back, close_button]
      } else {
        quick_pick.buttons = [close_button]
      }

      return new Promise((resolve) => {
        quick_pick.onDidTriggerButton((button) => {
          if (
            button === vscode.QuickInputButtons.Back ||
            button === close_button
          ) {
            quick_pick.hide()
          }
        })
        quick_pick.onDidAccept(() => {
          const selected = quick_pick.selectedItems[0]
          quick_pick.hide()
          if (!selected) return resolve(null)

          if (selected.label === custom_label) {
            resolve({})
          } else {
            resolve({ id: selected.label })
          }
        })
        quick_pick.onDidHide(() => {
          quick_pick.dispose()
          resolve(null)
        })
        quick_pick.show()
      })
    }

    while (true) {
      const choice = await show_add_options()
      if (!choice) return

      if (choice.id) {
        const name = choice.id as keyof typeof PROVIDERS
        const info = PROVIDERS[name]

        let current_name_value = name as string
        let back_to_options = false

        while (true) {
          const new_name = await prompt_for_name({
            current_name: current_name_value,
            is_creation: true,
            show_back: true
          })
          if (new_name == 'BACK') {
            back_to_options = true
            break
          }
          if (!new_name) return

          current_name_value = new_name

          let api_key = ''
          if (!info.base_url.includes('localhost')) {
            const { value, accepted, back } = await prompt_for_key('', true)
            if (back) continue
            if (!accepted) return
            api_key = value.trim()
          }

          const providers = await providers_manager.get_providers()

          let final_name = new_name
          let counter = 1
          while (providers.some((p) => p.name == final_name)) {
            final_name = `${new_name} (${counter})`
            counter++
          }

          const new_provider: Provider = {
            name: final_name,
            base_url: info.base_url,
            api_key
          }
          await providers_manager.save_providers([...providers, new_provider])
          return new_provider
        }
        if (back_to_options) continue
      } else {
        let custom_step = 'url'
        let new_url = ''
        let new_name = ''
        let back_to_options = false

        while (true) {
          if (custom_step == 'url') {
            const res = await prompt_for_url({
              current_url: new_url,
              show_back: true,
              is_required: true
            })
            if (res == 'BACK') {
              back_to_options = true
              break
            }
            if (!res) return
            new_url = res
            custom_step = 'name'
          } else if (custom_step == 'name') {
            const res = await prompt_for_name({
              current_name: new_name,
              is_creation: true,
              show_back: true
            })
            if (res == 'BACK') {
              custom_step = 'url'
              continue
            }
            if (!res) return
            new_name = res
            break
          }
        }

        if (back_to_options) continue

        working_provider = {
          name: new_name,
          base_url: normalize_base_url(new_url),
          api_key: ''
        }
        break
      }
    }
  }

  if (working_provider) {
    while (true) {
      await run_edit_loop(working_provider)

      if (!working_provider.base_url) {
        const selection = await vscode.window.showWarningMessage(
          'A Base URL is required for custom model providers.',
          { modal: true },
          'Continue Editing'
        )

        if (selection == 'Continue Editing') {
          continue
        }
        return
      }
      break
    }
  }

  if (working_provider.base_url && !working_provider.base_url.endsWith('/v1')) {
    try {
      const headers: { [key: string]: string } = {}
      if (working_provider.api_key) {
        headers['Authorization'] = `Bearer ${working_provider.api_key}`
      }
      await axios.get(`${working_provider.base_url}/v1/models`, {
        timeout: 2000,
        headers
      })
      working_provider.base_url = `${working_provider.base_url}/v1`
    } catch (error) {}
  }

  const providers = await providers_manager.get_providers()
  let updated_providers = [...providers]

  let final_name = working_provider.name
  let counter = 1
  while (
    updated_providers.some(
      (p) => p.name == final_name && p.name != original_name
    )
  ) {
    final_name = `${working_provider.name} (${counter})`
    counter++
  }
  working_provider.name = final_name

  if (original_name) {
    updated_providers = updated_providers.map((p) =>
      p.name == original_name ? working_provider! : p
    )
    if (original_name != working_provider.name) {
      await providers_manager.update_provider_name_in_configs({
        old_name: original_name,
        new_name: working_provider.name
      })
    }
  } else {
    if (params.create_on_top) {
      updated_providers.unshift(working_provider)
    } else if (actual_insertion_index !== undefined) {
      updated_providers.splice(actual_insertion_index, 0, working_provider)
    } else {
      updated_providers.push(working_provider)
    }
  }

  await providers_manager.save_providers(updated_providers)
  return working_provider
}
