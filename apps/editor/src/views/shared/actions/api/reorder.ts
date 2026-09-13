import * as vscode from 'vscode'
import {
  ProvidersManager,
  ApiConfiguration,
  get_api_configuration_id
} from '@/services/providers-manager'

export const reorder = async (params: {
  extension_context: vscode.ExtensionContext
  reordered_ids: string[]
}): Promise<void> => {
  const providers_manager = new ProvidersManager(params.extension_context)

  const current_api_configurations =
    await providers_manager.get_api_configurations()

  const reordered_api_configurations = params.reordered_ids
    .map((id) => {
      const found = current_api_configurations.find(
        (p) => get_api_configuration_id(p) === id
      )
      if (!found) {
        console.error(
          `API configuration with id ${id} not found during reorder.`
        )
        return null
      }
      return found
    })
    .filter((p): p is ApiConfiguration => p !== null)

  if (
    reordered_api_configurations.length === current_api_configurations.length
  ) {
    await providers_manager.save_api_configurations(
      reordered_api_configurations
    )
  }
}
