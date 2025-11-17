import * as vscode from 'vscode'
import { SettingsProvider } from '@/views/settings/backend/settings-provider'
import {
  ModelProvidersManager,
  CustomProvider
} from '@/services/model-providers-manager'
import { PROVIDERS } from '@shared/constants/providers'

const normalize_base_url = (url: string): string => {
  return url.trim().replace(/\/+$/, '')
}

export const handle_add_model_provider = async (
  provider: SettingsProvider
): Promise<void> => {
  const providers_manager = new ModelProvidersManager(provider.context)

  const create_custom_provider = async (): Promise<boolean> => {
    const name = await vscode.window.showInputBox({
      title: 'Model Provider Name',
      prompt: 'Enter a name for the custom model provider',
      validateInput: async (value) => {
        if (!value.trim()) return 'Name is required'
        if (
          (await providers_manager.get_providers()).some(
            (p) => p.type == 'custom' && p.name == value.trim()
          )
        ) {
          return 'A provider with this name already exists'
        }
        return null
      }
    })
    if (name === undefined) {
      return await show_create_provider_quick_pick()
    }

    const base_url = await vscode.window.showInputBox({
      title: 'Base URL',
      prompt: 'Enter base URL for the model provider',
      validateInput: (value) => (!value.trim() ? 'Base URL is required' : null)
    })
    if (base_url === undefined) {
      return await show_create_provider_quick_pick()
    }

    const normalized_base_url = normalize_base_url(base_url)
    const is_local = normalized_base_url.includes('localhost')

    let api_key: string | undefined = ''
    if (!is_local) {
      api_key = await vscode.window.showInputBox({
        title: 'API Key',
        prompt: 'Enter your API key'
      })
      if (api_key === undefined) {
        return await show_create_provider_quick_pick()
      }
    }

    const new_provider: CustomProvider = {
      type: 'custom' as const,
      name: name.trim(),
      base_url: normalized_base_url,
      api_key: api_key?.trim() || ''
    }

    const providers = await providers_manager.get_providers()
    await providers_manager.save_providers([...providers, new_provider])
    return true
  }

  const create_built_in_provider = async (
    name: keyof typeof PROVIDERS
  ): Promise<boolean> => {
    const provider_info = PROVIDERS[name]
    const is_local = provider_info.base_url.includes('localhost')

    let api_key: string | undefined = ''
    if (!is_local) {
      api_key = await vscode.window.showInputBox({
        title: 'API Key',
        prompt: 'Enter your API key'
      })
      if (api_key === undefined) {
        return await show_create_provider_quick_pick()
      }
    }

    const providers = await providers_manager.get_providers()
    await providers_manager.save_providers([
      ...providers,
      {
        type: 'built-in',
        name,
        api_key: api_key.trim()
      }
    ])

    return true
  }

  const show_create_provider_quick_pick = async (): Promise<boolean> => {
    const saved_providers = await providers_manager.get_providers()
    const saved_provider_names = saved_providers
      .filter((p) => p.type == 'built-in')
      .map((p) => p.name)

    const available_built_in = Object.entries(PROVIDERS).filter(
      ([id]) => !saved_provider_names.includes(id as keyof typeof PROVIDERS)
    )

    const custom_label = '$(edit) Custom endpoint...'

    const items: vscode.QuickPickItem[] = [
      {
        label: custom_label,
        description: 'You can use any OpenAI-API compatible provider'
      },
      {
        label: '',
        kind: vscode.QuickPickItemKind.Separator
      },
      {
        label: 'Predefined endpoints',
        kind: vscode.QuickPickItemKind.Separator
      },
      ...available_built_in.map((built_in_provider) => ({
        label: built_in_provider[0],
        detail: built_in_provider[1].base_url
      }))
    ]

    const quick_pick = vscode.window.createQuickPick()
    quick_pick.items = items
    quick_pick.title = 'Add New Model Provider'
    quick_pick.placeholder =
      'Choose a predefined provider or create a custom one'

    return new Promise<boolean>((resolve) => {
      let is_accepted = false
      quick_pick.onDidAccept(async () => {
        is_accepted = true
        const selected = quick_pick.selectedItems[0]
        quick_pick.hide()

        if (!selected) {
          resolve(false)
          return
        }

        if (selected.label == custom_label) {
          resolve(await create_custom_provider())
        } else {
          const selected_api_provider_id = available_built_in.find(
            (p) => p[0] == selected.label
          )![0]
          resolve(
            await create_built_in_provider(
              selected_api_provider_id as keyof typeof PROVIDERS
            )
          )
        }
      })

      quick_pick.onDidHide(() => {
        if (!is_accepted) {
          resolve(false)
        }
        quick_pick.dispose()
      })

      quick_pick.show()
    })
  }

  await show_create_provider_quick_pick()
}
