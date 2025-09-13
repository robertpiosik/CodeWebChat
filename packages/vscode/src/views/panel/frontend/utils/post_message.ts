import { FrontendMessage } from '@/views/panel/types/messages'

export const post_message = (vscode: any, message: FrontendMessage) => {
  vscode.postMessage(message)
}
