import { ViewProvider } from '@/view/backend/view-provider'
import * as vscode from 'vscode'

export const handle_setup_api_tool = async (
  provider: ViewProvider,
  tool: 'file-refactoring' | 'commit-messages'
): Promise<void> => {}
