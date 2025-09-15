import { FrontendMessage } from '@/views/settings/types/messages'

export const post_message = (vscode: any, message: FrontendMessage) => {
  vscode.postMessage(message)
}
