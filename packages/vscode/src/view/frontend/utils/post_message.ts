import { WebviewMessage } from '@/view/types/messages'

export const post_message = (vscode: any, message: WebviewMessage) => {
  vscode.postMessage(message)
}
