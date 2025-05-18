import * as vscode from 'vscode'
import { ViewProvider } from '@/view/backend/view-provider'
import {
  ApiProvidersManager,
  BuiltInProvider,
  CustomProvider,
  Provider
} from '@/services/api-providers-manager'
import { PROVIDERS } from '@shared/constants/providers'

const normalize_base_url = (url: string): string => {
  return url.trim().replace(/\/+$/, '')
}

export const handle_configure_api_providers = async (
  provider: ViewProvider
): Promise<void> => {
  const providers_manager = new ApiProvidersManager(provider.context)

  const edit_button = {
    iconPath: new vscode.ThemeIcon('edit'),
    tooltip: 'Edit'
  }

  const delete_button = {
    iconPath: new vscode.ThemeIcon('trash'),
    tooltip: 'Delete'
  }

  const move_up_button = {
    iconPath: new vscode.ThemeIcon('chevron-up'),
    tooltip: 'Move up'
  }

  const move_down_button = {
    iconPath: new vscode.ThemeIcon('chevron-down'),
    tooltip: 'Move down'
  }

  const change_api_key_button = {
    iconPath: new vscode.ThemeIcon('key'),
    tooltip: 'Change API key'
  }

  const create_provider_items = (): vscode.QuickPickItem[] => {
    const saved_providers = providers_manager.get_providers()

    return [
      {
        label: '$(add) Add another API provider...'
      },
      {
        label: '',
        kind: vscode.QuickPickItemKind.Separator
      },
      ...saved_providers.map((provider, index) => {
        const masked_api_key = provider.api_key
          ? `...${provider.api_key.slice(-4)}`
          : '⚠ Missing API key'

        const buttons = []

        if (saved_providers.length > 1) {
          buttons.push(move_up_button)
          buttons.push(move_down_button)
        }

        buttons.push(
          provider.type == 'built-in' ? change_api_key_button : edit_button
        )
        buttons.push(delete_button)

        return {
          label: provider.name,
          description: masked_api_key,
          detail:
            provider.type == 'custom'
              ? provider.base_url || '⚠ Missing base URL'
              : `${PROVIDERS[provider.name].base_url} (predefined)`,
          buttons: buttons,
          provider,
          index
        }
      })
    ]
  }

  const show_providers_quick_pick = async () => {
    const saved_providers = providers_manager.get_providers()

    if (saved_providers.length == 0) {
      await show_create_provider_quick_pick()
      return
    }

    const quick_pick = vscode.window.createQuickPick()
    quick_pick.items = create_provider_items()
    quick_pick.title = 'Configure API Providers'
    quick_pick.placeholder = 'Select an API provider to edit or add a new one'

    return new Promise<void>((resolve) => {
      quick_pick.onDidAccept(async () => {
        const selected = quick_pick.selectedItems[0]
        if (selected.label == '$(add) Add another API provider...') {
          quick_pick.hide()
          await show_create_provider_quick_pick()
        } else if ('provider' in selected) {
          // Handle selection of an existing provider item (clicking the label)
          quick_pick.hide()
          await edit_provider(selected.provider as Provider)
        }
        resolve()
      })

      quick_pick.onDidTriggerItemButton(async (event) => {
        const item = event.item as vscode.QuickPickItem & {
          provider: Provider
          index: number
        }

        if (event.button === edit_button) {
          quick_pick.hide()
          await edit_provider(item.provider)
          resolve()
        } else if (event.button === change_api_key_button) {
          quick_pick.hide()
          await edit_built_in_provider(item.provider as BuiltInProvider)
          resolve()
        } else if (event.button === delete_button) {
          const confirm = await vscode.window.showWarningMessage(
            `Are you sure you want to delete "${item.label}"?`,
            { modal: true },
            'Delete'
          )

          if (confirm == 'Delete') {
            const providers = providers_manager.get_providers()
            const updated_providers = providers.filter(
              (p) => p.name != item.provider.name
            )
            await providers_manager.save_providers(updated_providers)
            quick_pick.items = create_provider_items()
            if (updated_providers.length === 0) {
              quick_pick.hide()
              vscode.window.showInformationMessage(
                'All API providers have been removed.'
              )
              await show_create_provider_quick_pick()
              resolve()
            } else {
              quick_pick.show()
            }
          }
        } else if (
          event.button === move_up_button ||
          event.button === move_down_button
        ) {
          const providers = providers_manager.get_providers()
          const current_index = item.index

          const is_moving_up = event.button === move_up_button
          const min_index = 0
          const max_index = providers.length - 1
          const new_index = is_moving_up
            ? Math.max(min_index, current_index - 1)
            : Math.min(max_index, current_index + 1)

          if (new_index == current_index) {
            return
          }

          const reordered_providers = [...providers]
          const [moved_provider] = reordered_providers.splice(current_index, 1)
          reordered_providers.splice(new_index, 0, moved_provider)
          await providers_manager.save_providers(reordered_providers)
          quick_pick.items = create_provider_items()
        }
      })

      quick_pick.onDidHide(() => {
        resolve() // Resolve the promise if the user cancels
      })

      quick_pick.show()
    })
  }

  const show_create_provider_quick_pick = async () => {
    const saved_providers = providers_manager.get_providers()
    const saved_provider_names = saved_providers
      .filter((p) => p.type == 'built-in')
      .map((p) => p.name)

    const available_built_in = Object.entries(PROVIDERS).filter(
      ([id]) => !saved_provider_names.includes(id as keyof typeof PROVIDERS)
    )

    const back_label = '$(arrow-left) Back'
    const custom_label = '$(edit) Custom...'

    const items: vscode.QuickPickItem[] = [
      ...(saved_providers.length > 0 ? [{ label: back_label }] : []),
      {
        label: custom_label,
        description: 'Any OpenAI-API compatible provider'
      },
      {
        label: '',
        kind: vscode.QuickPickItemKind.Separator
      },
      {
        label: 'Predefined providers',
        kind: vscode.QuickPickItemKind.Separator
      },
      ...available_built_in.map((built_in_provider) => ({
        label: built_in_provider[0],
        detail: built_in_provider[1].base_url
      }))
    ]

    const selected = await vscode.window.showQuickPick(items, {
      title: 'Select Provider Type',
      placeHolder: 'Choose a predefined provider or create a custom one'
    })

    if (!selected) {
      if (saved_providers.length > 0) {
        await show_providers_quick_pick()
      }
      return
    }

    if (selected.label == back_label) {
      await show_providers_quick_pick()
      return
    } else if (selected.label == custom_label) {
      await create_custom_provider()
    } else {
      const selected_api_provider_id = available_built_in.find(
        (p) => p[0] == selected.label
      )![0]
      await create_built_in_provider(
        selected_api_provider_id as keyof typeof PROVIDERS
      )
    }
  }

  const create_custom_provider = async () => {
    const name = await vscode.window.showInputBox({
      title: 'Provider Name',
      prompt: 'Enter a name for the custom provider',
      validateInput: (value) => {
        if (!value.trim()) return 'Name is required'
        if (
          providers_manager
            .get_providers()
            .some((p) => p.type == 'custom' && p.name == value.trim())
        ) {
          return 'A provider with this name already exists'
        }
        return null
      }
    })
    if (!name) {
      await show_create_provider_quick_pick()
      return
    }

    const new_provider: CustomProvider = {
      type: 'custom' as const,
      name: name.trim(),
      base_url: '',
      api_key: ''
    }

    const providers = providers_manager.get_providers()
    await providers_manager.save_providers([...providers, new_provider])
    await edit_custom_provider(new_provider)
  }

  const create_built_in_provider = async (name: keyof typeof PROVIDERS) => {
    const api_key = await vscode.window.showInputBox({
      title: 'API Key',
      prompt: `Enter your API key for ${name}`,
      validateInput: (value) => (!value.trim() ? 'API key is required' : null)
    })
    if (!api_key) {
      await show_create_provider_quick_pick()
      return
    }

    const providers = providers_manager.get_providers()
    await providers_manager.save_providers([
      ...providers,
      {
        type: 'built-in',
        name,
        api_key: api_key.trim()
      }
    ])

    await show_providers_quick_pick()
  }

  const edit_provider = async (provider: Provider) => {
    if (provider.type == 'custom') {
      await edit_custom_provider(provider as CustomProvider)
    } else {
      // This case is now primarily handled by the change_api_key_button,
      // but keeping this function for completeness if the label is clicked.
      await edit_built_in_provider(provider as BuiltInProvider)
    }
  }

  const edit_custom_provider = async (provider: CustomProvider) => {
    const show_field_selection = async () => {
      const back_label = '$(arrow-left) Back'
      const edit_name_label = 'Name'
      const edit_base_url_label = 'Base URL'
      const change_api_key_label = 'API Key'

      const masked_api_key = provider.api_key
        ? `...${provider.api_key.slice(-4)}`
        : 'Not set'

      const field_to_edit = await vscode.window.showQuickPick(
        [
          { label: back_label },
          {
            label: '',
            kind: vscode.QuickPickItemKind.Separator
          },
          { label: edit_name_label, description: provider.name },
          {
            label: edit_base_url_label,
            description: `${provider.base_url || 'Not set'}`
          },
          {
            label: change_api_key_label,
            description: masked_api_key
          }
        ],
        {
          title: `Edit Custom API Provider: ${provider.name}`,
          placeHolder: 'Select what to edit',
          ignoreFocusOut: true
        }
      )

      if (!field_to_edit || field_to_edit.label == back_label) {
        await show_providers_quick_pick()
        return
      }

      const updated_provider: CustomProvider = { ...provider }

      if (field_to_edit.label == edit_name_label) {
        const new_name = await vscode.window.showInputBox({
          title: 'Provider Name',
          prompt: 'Enter a new name for the custom provider',
          value: provider.name,
          validateInput: (value) => {
            if (!value.trim()) return 'Name is required'
            if (
              value.trim() != provider.name &&
              providers_manager
                .get_providers()
                .some((p) => p.type == 'custom' && p.name == value.trim())
            ) {
              return 'A provider with this name already exists'
            }
            return null
          }
        })
        if (new_name === undefined) {
          await show_field_selection()
          return
        }
        if (new_name && new_name.trim() != provider.name) {
          const old_name = provider.name
          updated_provider.name = new_name.trim()

          const providers = providers_manager.get_providers()
          const updated_providers = providers.map((p) =>
            p.type == 'custom' && p.name == old_name ? updated_provider : p
          )
          await providers_manager.save_providers(updated_providers)

          await providers_manager.update_provider_name_in_configs({
            old_name,
            new_name: updated_provider.name
          })

          provider = updated_provider

          await show_field_selection()
          return
        }
      } else if (field_to_edit.label == edit_base_url_label) {
        const new_base_url = await vscode.window.showInputBox({
          title: 'Base URL',
          prompt: 'Enter base URL for the API',
          value: provider.base_url,
          validateInput: (value) =>
            !value.trim() ? 'Base URL is required' : null
        })
        if (new_base_url === undefined) {
          await show_field_selection()
          return
        }
        if (new_base_url !== undefined) {
          // Normalize base URL to not end with slash
          updated_provider.base_url = normalize_base_url(new_base_url)
        }
      } else if (field_to_edit.label == change_api_key_label) {
        const new_api_key = await vscode.window.showInputBox({
          title: 'API Key',
          prompt: 'Enter your API key',
          placeHolder: '(Keep current API key)'
        })
        if (new_api_key === undefined) {
          await show_field_selection()
          return
        }
        if (new_api_key) {
          updated_provider.api_key = new_api_key.trim()
        }
      }

      // Save the updated provider (for URL and API key changes, or if name wasn't changed)
      // This save happens only if the name change block didn't execute and return
      const providers = providers_manager.get_providers()
      const updated_providers = providers.map((p) =>
        p.type == 'custom' && p.name == provider.name ? updated_provider : p
      )
      await providers_manager.save_providers(updated_providers)

      // Update the provider reference for future edits in this session
      provider = updated_provider

      // Return to field selection after editing a field
      await show_field_selection()
    }

    // Start the field selection
    await show_field_selection()
  }

  const edit_built_in_provider = async (provider: BuiltInProvider) => {
    const api_key = await vscode.window.showInputBox({
      title: `API Key for ${provider.name}`,
      prompt: `Enter your API key for ${provider.name}`,
      placeHolder: '(Keep current API key)'
    })
    if (api_key === undefined) {
      // User cancelled
      await show_providers_quick_pick() // Go back to main list
      return
    }

    const updated_provider = {
      ...provider,
      api_key: api_key.trim() || provider.api_key
    } as BuiltInProvider

    // Save the updated provider
    const providers = providers_manager.get_providers()
    const updated_providers = providers.map((p) =>
      p.type == 'built-in' && p.name == provider.name ? updated_provider : p
    )
    await providers_manager.save_providers(updated_providers)

    await show_providers_quick_pick()
  }

  await show_providers_quick_pick()
}
