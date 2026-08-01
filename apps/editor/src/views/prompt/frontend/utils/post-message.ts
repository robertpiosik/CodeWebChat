import { FrontendMessage } from '@/views/prompt/types/messages'

export const post_message = (vscode: any, message: FrontendMessage) => {
  vscode.postMessage(message)
}
