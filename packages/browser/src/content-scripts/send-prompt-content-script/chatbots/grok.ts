import { Chatbot } from '../types/chatbot'
import { CHATBOTS } from '@shared/constants/chatbots'

export const grok: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        if (document.querySelector('button[aria-label="Think"]')) {
          resolve(null)
        } else {
          setTimeout(check_for_element, 100)
        }
      }
      check_for_element()
    })
  },
  set_options: async (options: string[]) => {
    const supported_options = CHATBOTS['Grok'].supported_options
    for (const option of options) {
      if (option == 'think' && supported_options['think']) {
        const think_button = document.querySelector(
          'button[aria-label="Think"]'
        ) as HTMLButtonElement
        if (think_button) {
          think_button.click()
        }
      }
    }
  }
}
