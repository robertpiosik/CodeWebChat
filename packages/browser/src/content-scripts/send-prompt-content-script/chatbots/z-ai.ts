import { Chatbot } from '../types/chatbot'
import {
  add_apply_response_button,
  observe_for_responses
} from '../utils/add-apply-response-button'
import { report_initialization_error } from '../utils/report-initialization-error'

export const z_ai: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        if (document.querySelector('textarea')) {
          resolve(null)
        } else {
          setTimeout(check_for_element, 100)
        }
      }
      check_for_element()
    })
  },
  set_options: async (chat) => {
    const options = chat.options
    if (!options) return

    const deep_think_button = document.querySelector(
      'button[data-autothink]'
    ) as HTMLButtonElement
    if (!deep_think_button) {
      report_initialization_error({
        function_name: 'z_ai.set_options',
        log_message: 'Auto think button not found'
      })
      return
    }

    const should_be_on = options.includes('deep-think')
    const is_on = deep_think_button.getAttribute('data-autothink') == 'true'

    if (should_be_on != is_on) {
      deep_think_button.click()
      await new Promise((r) => requestAnimationFrame(r))
    }
  },
  inject_apply_response_button: (
    client_id: number,
    raw_instructions?: string,
    edit_format?: string
  ) => {
    const add_buttons = (footer: Element) => {
      add_apply_response_button({
        client_id,
        raw_instructions,
        edit_format,
        footer,
        get_chat_turn: (f) => f.parentElement!.querySelector('.chat-assistant'),
        get_code_from_block: (b) => b.querySelector('.cm-line')?.textContent,
        perform_copy: (f) => {
          const copy_button = f.querySelector('button.copy-response-button')
          if (!copy_button) {
            report_initialization_error({
              function_name: 'z_ai.perform_copy',
              log_message: 'Copy button not found'
            })
            return
          }
          ;(copy_button as HTMLElement).click()
        },
        insert_button: (f, b) => f.insertBefore(b, f.children[0])
      })
    }

    observe_for_responses({
      chatbot_name: 'Z.AI',
      is_generating: () =>
        !document.querySelector('button[id="send-message-button"]'),
      footer_selector: '.chat-assistant + div',
      add_buttons
    })
  }
}
