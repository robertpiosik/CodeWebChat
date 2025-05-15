import * as vscode from 'vscode'
import { ViewProvider } from '@/view/backend/view-provider'
import {
  ApiProvidersManager,
  BuiltInProvider,
  CustomProvider,
  Provider
} from '@/services/api-providers-manager'
import { PROVIDERS } from '@shared/constants/providers'

export const handle_configure_api_providers = async (
  provider: ViewProvider
): Promise<void> => {
  const providers_manager = new ApiProvidersManager(provider.context)

  const delete_button = {
    iconPath: new vscode.ThemeIcon('trash'),
    tooltip: 'Delete provider'
  }

  const move_up_button = {
    iconPath: new vscode.ThemeIcon('chevron-up'),
    tooltip: 'Move up'
  }

  const move_down_button = {
    iconPath: new vscode.ThemeIcon('chevron-down'),
    tooltip: 'Move down'
  }

  const create_provider_items = () => {
    const saved_providers = providers_manager.get_providers()

    return [
      {
        label: '$(add) Create new...',
        description: 'Configure a new API provider'
      },
      ...saved_providers.map((provider, index) => ({
        label: provider.name,
        description:
          provider.type == 'built-in'
            ? 'Built-in API provider'
            : 'Custom API provider',
        buttons: [move_up_button, move_down_button, delete_button],
        provider,
        index
      }))
    ]
  }

  const show_providers_quick_pick = async () => {
    const quick_pick = vscode.window.createQuickPick()
    quick_pick.items = create_provider_items()
    quick_pick.title = 'Configure API Providers'
    quick_pick.placeholder = 'Select a provider to edit or create a new one'

    return new Promise<void>((resolve) => {
      quick_pick.onDidAccept(async () => {
        const selected = quick_pick.selectedItems[0]
        if (selected.label == '$(add) Create new...') {
          quick_pick.hide()
          await show_create_provider_quick_pick()
        } else if ('provider' in selected) {
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

        if (event.button === delete_button) {
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
            // Update quick pick items after deletion
            quick_pick.items = create_provider_items()
            // If no items left, hide the quick pick
            if (quick_pick.items.length <= 1) {
              // Only "Create new..." remains
              quick_pick.hide()
              vscode.window.showInformationMessage(
                'All API providers have been removed.'
              )
              resolve() // Resolve the promise as the flow is finished
            } else {
              quick_pick.show() // Ensure quick pick stays visible
            }
          }
        } else if (
          event.button === move_up_button ||
          event.button === move_down_button
        ) {
          const providers = providers_manager.get_providers()
          const current_index = item.index

          // Calculate new index based on direction
          const is_moving_up = event.button === move_up_button
          const new_index = is_moving_up
            ? Math.max(0, current_index - 1)
            : Math.min(providers.length - 1, current_index + 1)

          // Don't do anything if already at the boundary
          if (new_index == current_index) {
            return
          }

          // Create a new array with reordered providers
          const reordered_providers = [...providers]

          // Remove the provider from the current position
          const [moved_provider] = reordered_providers.splice(current_index, 1)

          // Insert the provider at the new position
          reordered_providers.splice(new_index, 0, moved_provider)

          // Save the reordered providers
          await providers_manager.save_providers(reordered_providers)

          // Update quick pick items to reflect the new order
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

    const items: vscode.QuickPickItem[] = [
      {
        label: 'Custom...',
        description: 'Configure a custom API provider'
      },
      ...available_built_in.map((built_in_provider) => ({
        label: built_in_provider[0]
      }))
    ]

    const selected = await vscode.window.showQuickPick(items, {
      title: 'Select Provider Type',
      placeHolder: 'Choose a built-in provider or create a custom one'
    })

    if (!selected) {
      // If user cancels creation, return to the main providers list
      await show_providers_quick_pick()
      return
    }

    if (selected.label == 'Custom...') {
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
      await show_create_provider_quick_pick() // Go back to type selection
      return
    }

    const base_url = await vscode.window.showInputBox({
      title: 'Base URL',
      prompt: 'Enter the base URL for the API',
      validateInput: (value) => (!value.trim() ? 'Base URL is required' : null)
    })
    if (!base_url) {
      await show_create_provider_quick_pick() // Go back to type selection
      return
    }

    const api_key = await vscode.window.showInputBox({
      title: 'API Key',
      prompt: 'Enter your API key',
      validateInput: (value) => (!value.trim() ? 'API key is required' : null)
    })
    if (!api_key) {
      await show_create_provider_quick_pick() // Go back to type selection
      return
    }

    const providers = providers_manager.get_providers()
    await providers_manager.save_providers([
      ...providers,
      {
        type: 'custom' as const,
        name: name.trim(),
        base_url: base_url.trim(),
        api_key: api_key.trim()
      }
    ])

    await show_providers_quick_pick() // Return to main list
  }

  const create_built_in_provider = async (name: keyof typeof PROVIDERS) => {
    const api_key = await vscode.window.showInputBox({
      title: 'API Key',
      prompt: `Enter your API key for ${name}`,
      validateInput: (value) => (!value.trim() ? 'API key is required' : null)
    })
    if (!api_key) {
      await show_create_provider_quick_pick() // Go back to type selection
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

    await show_providers_quick_pick() // Return to main list
  }

  const edit_provider = async (provider: Provider) => {
    let updated_provider: Provider

    if (provider.type == 'custom') {
      const name = await vscode.window.showInputBox({
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
      if (!name) {
        await show_providers_quick_pick() // Go back to main list
        return
      }

      const base_url = await vscode.window.showInputBox({
        title: 'Base URL',
        prompt: 'Enter the new base URL for the API',
        value: provider.base_url,
        validateInput: (value) =>
          !value.trim() ? 'Base URL is required' : null
      })
      if (!base_url) {
        await show_providers_quick_pick() // Go back to main list
        return
      }

      const api_key = await vscode.window.showInputBox({
        title: 'API Key',
        prompt: 'Enter your API key',
        placeHolder: '(Keep current API key)'
      })
      if (api_key === undefined) {
        // User cancelled
        await show_providers_quick_pick() // Go back to main list
        return
      }

      updated_provider = {
        ...provider,
        name: name.trim(),
        base_url: base_url.trim(),
        api_key: api_key.trim() || provider.api_key
      } as CustomProvider
    } else {
      // Built-in provider
      const api_key = await vscode.window.showInputBox({
        title: 'API Key',
        prompt: `Enter your API key`,
        placeHolder: '(Keep current API key)'
      })
      if (api_key === undefined) {
        // User cancelled
        await show_providers_quick_pick() // Go back to main list
        return
      }

      updated_provider = {
        ...provider,
        api_key: api_key.trim() || provider.api_key
      } as BuiltInProvider
    }

    // Save the updated provider
    const providers = providers_manager.get_providers()
    const updated_providers = providers.map((p) =>
      p.type == updated_provider.type &&
      (p.type == 'built-in'
        ? p.name == updated_provider.name
        : p.name == provider.name)
        ? updated_provider
        : p
    )
    await providers_manager.save_providers(updated_providers)

    await show_providers_quick_pick() // Return to main list
  }

  await show_providers_quick_pick()
}
