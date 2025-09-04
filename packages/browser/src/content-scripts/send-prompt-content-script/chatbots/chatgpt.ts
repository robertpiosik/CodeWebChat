import { CHATBOTS } from '@shared/constants/chatbots'
import { Chatbot } from '../types/chatbot'
import {
  add_apply_response_button,
  observe_for_responses
} from '../utils/add-apply-response-button'

export const chatgpt: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        if (
          document.querySelector(
            'span[data-testid="blocking-initial-modals-done"]'
          )
        ) {
          resolve(null)
        } else {
          setTimeout(check_for_element, 100)
        }
      }
      check_for_element()
    })
  },
  set_options: async (options?: string[]) => {
    if (!options) return
    const supported_options = CHATBOTS['ChatGPT'].supported_options
    for (const option of options) {
      if (option == 'temporary' && supported_options['temporary']) {
        const buttons = document.querySelectorAll('button')
        for (const item of Array.from(buttons)) {
          const path_element = item.querySelector(
            'path[d="M15.5713 4.33536C14.5314 3.41405 13.2387 2.74892 11.8057 2.44181C11.4468 2.3651 11.0937 2.59374 11.0166 2.95255C10.9396 3.31166 11.1682 3.66563 11.5273 3.74259C12.7361 4.00163 13.8209 4.56095 14.6895 5.33048L14.8604 5.4877L14.9668 5.56973C15.2291 5.73327 15.5785 5.69604 15.7998 5.46329C16.0211 5.23026 16.0403 4.87903 15.8633 4.6254L15.7754 4.52286L15.5713 4.33536Z"]'
          )
          if (path_element) {
            ;(item as HTMLElement).click()
            break
          }
        }
        await new Promise((resolve) => {
          const check_for_param = () => {
            if (window.location.search.includes('temporary-chat=true')) {
              resolve(null)
            } else {
              setTimeout(check_for_param, 100)
            }
          }
          check_for_param()
        })
      }
    }
  },
  inject_apply_response_button: (client_id: number) => {
    const add_buttons = (footer: Element) => {
      add_apply_response_button({
        client_id,
        footer,
        get_chat_turn: (f) => f.closest('.agent-turn'),
        get_code_blocks: (t) => t.querySelectorAll('code'),
        perform_copy: (f) => {
          const copy_button = f.querySelector(
            'button[data-testid="copy-turn-action-button"]'
          ) as HTMLElement
          copy_button.click()
        },
        insert_button: (f, b) =>
          f.insertBefore(b, f.children[f.children.length])
      })
    }

    observe_for_responses({
      chatbot_name: 'ChatGPT',
      is_generating: () =>
        !!document.querySelector('button[data-testid="stop-button"]'),
      footer_selector: '.agent-turn > div:nth-of-type(2) > div',
      add_buttons
    })
  }
}
