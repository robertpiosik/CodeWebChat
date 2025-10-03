import { Chatbot } from '../types/chatbot'
import { CHATBOTS } from '@shared/constants/chatbots'
import {
  add_apply_response_button,
  observe_for_responses
} from '../utils/add-apply-response-button'
import {
  InitializationError,
  report_initialization_error
} from '../utils/report-initialization-error'

export const copilot: Chatbot = {
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
  set_model: async (model?: string) => {
    if (!model) return

    const model_selector_button = document.querySelector(
      'button[data-testid="composer-chat-mode-quick-button"]'
    ) as HTMLButtonElement
    if (!model_selector_button) {
      report_initialization_error({
        function_name: 'set_model',
        log_message: 'Model selector button not found',
        alert_message: InitializationError.UNABLE_TO_SET_MODEL
      })
      return
    }

    const model_label_to_find = (CHATBOTS['Copilot'].models as any)[model]
      ?.label
    if (!model_label_to_find) return

    // The current model text is inside the button
    if (model_selector_button.textContent?.includes(model_label_to_find)) {
      return
    }

    model_selector_button.click()
    await new Promise((r) => requestAnimationFrame(r))

    const options_container = document.querySelector('div[id="popoverPortal"]')
    if (!options_container) {
      report_initialization_error({
        function_name: 'set_model',
        log_message: 'Model options container not found',
        alert_message: InitializationError.UNABLE_TO_SET_MODEL
      })
      // click again to close
      model_selector_button.click()
      return
    }

    const options = options_container.querySelectorAll(
      'button[role="menuitem"]'
    )

    let found = false
    for (const option of Array.from(options)) {
      if (option.textContent?.includes(model_label_to_find)) {
        ;(option as HTMLElement).click()
        found = true
        break
      }
    }

    if (!found) {
      report_initialization_error({
        function_name: 'set_model',
        log_message: `Model option "${model_label_to_find}" not found`,
        alert_message: InitializationError.UNABLE_TO_SET_MODEL
      })
      // click again to close dropdown
      model_selector_button.click()
    }

    await new Promise((r) => requestAnimationFrame(r))
  },
  enter_message_and_send: async (params) => {
    const input_element = document.querySelector(
      'textarea'
    ) as HTMLTextAreaElement
    if (!input_element) {
      report_initialization_error({
        function_name: 'enter_message_and_send',
        log_message: 'Message input textarea not found for Copilot',
        alert_message: InitializationError.UNABLE_TO_SEND_MESSAGE
      })
      return
    }
    input_element.value = params.message
    input_element.dispatchEvent(new Event('input', { bubbles: true }))
    input_element.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise((r) => requestAnimationFrame(r))

    if (params.without_submission) return

    const send_button = document.querySelector(
      'button[data-testid="submit-button"]'
    ) as HTMLElement

    if (!send_button || send_button.hasAttribute('disabled')) {
      report_initialization_error({
        function_name: 'enter_message_and_send',
        log_message: 'Send button not found or disabled for Copilot',
        alert_message: InitializationError.UNABLE_TO_SEND_MESSAGE
      })
      return
    }
    send_button.click()
  },
  inject_apply_response_button: (
    client_id: number,
    raw_instructions?: string
  ) => {
    const add_buttons = (footer: Element) => {
      add_apply_response_button({
        client_id,
        raw_instructions,
        footer,
        get_chat_turn: (f) => f.closest('div[data-content="ai-message"]'),
        get_code_blocks: (t) => t.querySelectorAll('code'),
        perform_copy: (f) => {
          const copy_button = f.querySelector(
            'button[data-testid="copy-message-button"]'
          ) as HTMLElement
          if (!copy_button) {
            report_initialization_error({
              function_name: 'copilot.perform_copy',
              log_message: 'Copy button not found',
              alert_message: InitializationError.UNABLE_TO_COPY_RESPONSE
            })
            return
          }
          copy_button.click()
        },
        insert_button: (f, b) => f.insertBefore(b, f.firstChild)
      })
    }

    observe_for_responses({
      chatbot_name: 'Copilot',
      is_generating: () =>
        !!document.querySelector('button[data-testid="stop-button"]'),
      footer_selector: 'div[data-testid="message-item-reactions"]',
      add_buttons
    })
  }
}
