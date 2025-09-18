import { Chatbot } from '../types/chatbot'
import { Logger } from '@shared/utils/logger'
import {
  add_apply_response_button,
  observe_for_responses
} from '../utils/add-apply-response-button'

export const kimi: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        if (document.querySelector('.home-case-list')) {
          resolve(null)
        } else {
          setTimeout(check_for_element, 100)
        }
      }
      check_for_element()
    })
  },
  enter_message_and_send: async (message: string) => {
    const input_element = document.querySelector(
      'div[contenteditable=true]'
    ) as HTMLElement
    if (!input_element) {
      Logger.error({
        function_name: 'kimi.enter_message_and_send',
        message: 'Message input element not found'
      })
      alert('Unable to send message. Please open an issue.')
      return
    }

    input_element.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: message
      })
    )

    await new Promise<void>((resolve) => {
      const check_button_state = () => {
        const send_button_container = document.querySelector(
          '.send-button-container'
        )
        const send_button = document.querySelector(
          'div.send-button'
        ) as HTMLElement

        if (
          send_button &&
          !send_button_container?.classList.contains('disabled')
        ) {
          send_button.click()
          resolve()
        } else {
          setTimeout(check_button_state, 100)
        }
      }
      check_button_state()
    })
  },
  inject_apply_response_button: (client_id: number) => {
    const add_buttons = (footer: Element) => {
      add_apply_response_button({
        client_id,
        footer,
        get_chat_turn: (f) => f.closest('.segment-content'),
        get_code_blocks: (t) => t.querySelectorAll('code'),
        perform_copy: () => {
          const copy_button = footer.querySelector(
            '.segment-assistant-actions-content > div:first-child'
          ) as HTMLElement
          if (!copy_button) {
            Logger.error({
              function_name: 'kimi.perform_copy',
              message: 'Copy button not found'
            })
            alert('Unable to copy response. Please open an issue.')
            return
          }
          copy_button.click()
        },
        insert_button: (f, b) => {
          // This relies on `document.querySelector` instead of a footer-relative one, which is brittle.
          f.insertBefore(b, f.children[6])
        }
      })
    }

    observe_for_responses({
      chatbot_name: 'Kimi',
      is_generating: () =>
        !!document.querySelector(
          'path[d="M331.946667 379.904c-11.946667 23.466667-11.946667 54.186667-11.946667 115.626667v32.938666c0 61.44 0 92.16 11.946667 115.626667 10.538667 20.650667 27.306667 37.418667 47.957333 47.957333 23.466667 11.946667 54.186667 11.946667 115.626667 11.946667h32.938666c61.44 0 92.16 0 115.626667-11.946667 20.650667-10.538667 37.418667-27.306667 47.957333-47.957333 11.946667-23.466667 11.946667-54.186667 11.946667-115.626667v-32.938666c0-61.44 0-92.16-11.946667-115.626667a109.696 109.696 0 0 0-47.957333-47.957333c-23.466667-11.946667-54.186667-11.946667-115.626667-11.946667h-32.938666c-61.44 0-92.16 0-115.626667 11.946667-20.650667 10.538667-37.418667 27.306667-47.957333 47.957333z"]'
        ),
      footer_selector: '.segment-assistant-actions-content',
      add_buttons
    })
  }
}
