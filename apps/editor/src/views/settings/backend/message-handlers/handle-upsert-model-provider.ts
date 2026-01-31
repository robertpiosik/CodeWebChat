import {
  CustomProvider,
  ModelProvidersManager
} from '@/services/model-providers-manager'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import { dictionary } from '@shared/constants/dictionary'
import { PROVIDERS } from '@shared/constants/providers'
import axios from 'axios'
import * as vscode from 'vscode'
import { handle_get_model_providers } from './handle-get-model-providers'

const normalize_base_url = (url: string): string => {
  return url.trim().replace(/\/+$/, '')
}

export const handle_upsert_model_provider = async (params: {
  provider: SettingsProvider
  provider_name?: string
  insertion_index?: number
  create_on_top?: boolean
}): Promise<void> => {
  const { provider, provider_name, insertion_index, create_on_top } = params
  const providers_manager = new ModelProvidersManager(provider.context)

  const prompt_for_name = async (
    current_name: string,
    is_creation: boolean,
    show_back = false
  ): Promise<string | undefined | 'BACK'> => {
    return new Promise((resolve) => {
      const input_box = vscode.window.createInputBox()
      input_box.title = is_creation ? 'Enter Name' : 'Edit Name'
      input_box.prompt = 'Name of the custom model provider'
      input_box.value = current_name
      if (!is_creation) {
        input_box.valueSelection = [0, input_box.value.length]
      }

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
            cleanup()
            resolve('BACK')
          }
        }),
        input_box.onDidAccept(async () => {
          const new_name = input_box.value.trim()

          if (!new_name) {
            input_box.validationMessage = 'Name is required'
            return
          }

          // Check for duplicates
          // If creation: cannot exist at all
          // If edit: cannot exist unless it's the same provider
          const providers = await providers_manager.get_providers()
          const exists = providers.some(
            (p) =>
              p.type == 'custom' &&
              p.name == new_name &&
              (is_creation || p.name !== current_name)
          )

          if (exists) {
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
            resolve(undefined)
            cleanup()
          }
        })
      )

      input_box.show()
    })
  }

  const prompt_for_url = (
    current_url: string,
    show_back = false
  ): Promise<string | undefined | 'BACK'> => {
    return new Promise((resolve) => {
      const input_box = vscode.window.createInputBox()
      input_box.title = 'Edit Base URL'
      input_box.prompt = 'Enter the base URL'
      input_box.value = current_url
      input_box.valueSelection = [0, input_box.value.length]

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
            cleanup()
            resolve('BACK')
          }
        }),
        input_box.onDidAccept(() => {
          is_accepted = true
          cleanup()
          resolve(input_box.value)
        }),
        input_box.onDidHide(() => {
          if (!is_accepted) {
            resolve(undefined)
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
      input_box.title = 'Edit API Key'
      input_box.prompt = 'Enter your API key'
      input_box.password = true
      input_box.placeholder = current_key
        ? `...${current_key.slice(-4)}`
        : 'No API key set'

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
            resolve({ value: input_box.value, accepted: false })
            cleanup()
          }
        })
      )
      input_box.show()
    })
  }

  const run_edit_loop = async (
    provider_to_edit: CustomProvider
  ): Promise<void> => {
    // eslint-disable-next-line no-constant-condition
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
        iconPath: new vscode.ThemeIcon('close'),
        tooltip: 'Done'
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

      if (selected_id === 'rename') {
        const new_name = await prompt_for_name(
          provider_to_edit.name,
          false,
          true
        )
        if (new_name === 'BACK') continue
        if (new_name && new_name !== provider_to_edit.name) {
          provider_to_edit.name = new_name
        }
      } else if (selected_id === 'edit-url') {
        const new_url = await prompt_for_url(provider_to_edit.base_url, true)
        if (new_url === 'BACK') continue
        if (new_url !== undefined) {
          provider_to_edit.base_url = normalize_base_url(new_url)
        }
      } else if (selected_id === 'change-key') {
        const {
          value: new_key,
          accepted,
          back
        } = await prompt_for_key(provider_to_edit.api_key, true)
        if (back) continue
        if (accepted) {
          const trimmed_key = new_key.trim()
          if (trimmed_key !== provider_to_edit.api_key) {
            if (trimmed_key === '' && provider_to_edit.api_key) {
              const confirmation = await vscode.window.showWarningMessage(
                dictionary.warning_message.CONFIRM_CLEAR_API_KEY(
                  provider_to_edit.name
                ),
                { modal: true },
                'Clear API Key'
              )
              if (confirmation === 'Clear API Key') {
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

  if (insertion_index !== undefined) {
    const position_quick_pick = await new Promise<string | undefined>(
      (resolve) => {
        const quick_pick = vscode.window.createQuickPick()
        quick_pick.items = [
          { label: 'Insert new provider above' },
          { label: 'Insert new provider below' }
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
      position_quick_pick == 'Insert new provider above'
        ? insertion_index
        : insertion_index + 1
  }

  let working_provider: CustomProvider | undefined
  let original_name: string | undefined

  if (provider_name) {
    const existing = await providers_manager.get_provider(provider_name)
    if (!existing || existing.type !== 'custom') {
      // If it's not custom, we can't edit it via this flow (built-ins have simple key change)
      // or it doesn't exist.
      vscode.window.showErrorMessage(
        dictionary.error_message.MODEL_PROVIDER_NOT_FOUND_BY_NAME(provider_name)
      )
      return
    }
    working_provider = { ...existing }
    original_name = existing.name
  } else {
    const show_add_options = async (): Promise<{
      type: 'built-in' | 'custom'
      id?: string
    } | null> => {
      const saved_providers = await providers_manager.get_providers()
      const saved_built_ins = saved_providers
        .filter((p) => p.type === 'built-in')
        .map((p) => p.name)

      const available_built_in = Object.entries(PROVIDERS).filter(
        ([id]) => !saved_built_ins.includes(id as keyof typeof PROVIDERS)
      )

      const custom_label = '$(edit) Custom endpoint...'
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
      quick_pick.title = 'Add New Model Provider'
      quick_pick.placeholder =
        'Choose a predefined provider or create a custom one'

      return new Promise((resolve) => {
        quick_pick.onDidAccept(() => {
          const selected = quick_pick.selectedItems[0]
          quick_pick.hide()
          if (!selected) return resolve(null)

          if (selected.label === custom_label) {
            resolve({ type: 'custom' })
          } else {
            resolve({ type: 'built-in', id: selected.label })
          }
        })
        quick_pick.onDidHide(() => {
          quick_pick.dispose()
          resolve(null)
        })
        quick_pick.show()
      })
    }

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const choice = await show_add_options()
      if (!choice) return

      if (choice.type === 'built-in' && choice.id) {
        // Add built-in provider
        const name = choice.id as keyof typeof PROVIDERS
        const info = PROVIDERS[name]
        let api_key = ''

        if (!info.base_url.includes('localhost')) {
          const { value, accepted, back } = await prompt_for_key('', true)
          if (back) continue
          if (!accepted) return
          api_key = value.trim()
        }

        const providers = await providers_manager.get_providers()
        await providers_manager.save_providers([
          ...providers,
          { type: 'built-in', name, api_key }
        ])
        await handle_get_model_providers(provider)
        return
      }

      const new_name = await prompt_for_name('', true, true)
      if (new_name === 'BACK') continue
      if (!new_name) return

      working_provider = {
        type: 'custom',
        name: new_name,
        base_url: '',
        api_key: ''
      }
      break
    }
  }

  if (working_provider) {
    // eslint-disable-next-line no-constant-condition
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
      // Check if /v1/models works
      await axios.get(`${working_provider.base_url}/v1/models`, {
        timeout: 2000,
        headers
      })
      // If successful, append /v1
      working_provider.base_url = `${working_provider.base_url}/v1`
    } catch (error) {
      // Ignore errors (connection refused, 404, etc.)
    }
  }

  const providers = await providers_manager.get_providers()
  let updated_providers = [...providers]

  if (original_name) {
    // Update existing
    updated_providers = updated_providers.map((p) =>
      p.name === original_name && p.type === 'custom' ? working_provider! : p
    )
    if (original_name !== working_provider.name) {
      await providers_manager.update_provider_name_in_configs({
        old_name: original_name,
        new_name: working_provider.name
      })
    }
  } else {
    // Append new
    if (create_on_top) {
      updated_providers.unshift(working_provider)
    } else if (actual_insertion_index !== undefined) {
      updated_providers.splice(actual_insertion_index, 0, working_provider)
    } else {
      updated_providers.push(working_provider)
    }
  }

  await providers_manager.save_providers(updated_providers)
  await handle_get_model_providers(provider)
}
