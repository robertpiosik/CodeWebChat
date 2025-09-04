import { Chatbot } from '../types/chatbot'
import {
  add_apply_response_button,
  observe_for_responses
} from '../utils/add-apply-response-button'

export const mistral: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        if (document.querySelector('div[contenteditable="true"]')) {
          resolve(null)
        } else {
          setTimeout(check_for_element, 100)
        }
      }
      check_for_element()
    })
    await new Promise((resolve) => setTimeout(resolve, 500))
  },
  set_options: async (options?: string[]) => {
    if (!options) return
    const think_button_icon_path = document.querySelector(
      'path[d="M9 18h6"]'
    ) as SVGPathElement

    const think_button = think_button_icon_path.closest(
      'button'
    ) as HTMLButtonElement

    const should_be_on = options.includes('think')
    const is_on = think_button.getAttribute('data-state') == 'on'

    if (should_be_on != is_on) {
      think_button.click()
      await new Promise((r) => requestAnimationFrame(r))
    }
  },
  inject_apply_response_button: (client_id: number) => {
    const add_buttons = (footer: Element) => {
      add_apply_response_button({
        client_id,
        footer,
        get_chat_turn: (f) =>
          f.parentElement?.parentElement?.querySelector(
            'div[data-message-part-type="answer"]'
          ) as HTMLElement,
        get_code_blocks: (t) => t.querySelectorAll('code'),
        perform_copy: (f) => {
          const copy_button = f.querySelector(
            'button:last-child'
          ) as HTMLElement
          copy_button.click()
        },
        insert_button: (f, b) => f.insertBefore(b, f.children[0])
      })
    }

    requestAnimationFrame(() => {
      observe_for_responses({
        chatbot_name: 'Mistral',
        is_generating: () =>
          !document.querySelector(
            'path[d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"]'
          ) || !!document.querySelector('form rect[rx="2"]'),
        footer_selector:
          'div[data-message-author-role="assistant"] > div:last-child > div:last-child > div:last-child',
        add_buttons
      })
    })
  }
}
