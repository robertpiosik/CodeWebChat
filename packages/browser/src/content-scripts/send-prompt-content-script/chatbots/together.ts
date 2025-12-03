import { Chatbot } from '../types/chatbot'
import { CHATBOTS } from '@shared/constants/chatbots'
import {
  add_apply_response_button,
  observe_for_responses
} from '../utils/add-apply-response-button'
import { report_initialization_error } from '../utils/report-initialization-error'

export const together: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        if (document.activeElement?.tagName == 'TEXTAREA') {
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

    const model_label_to_find = CHATBOTS['Together'].models?.[model]?.label
    if (!model_label_to_find) return

    const model_selector_button = document.querySelector(
      'button[aria-haspopup="listbox"]'
    ) as HTMLButtonElement
    if (!model_selector_button) {
      report_initialization_error({
        function_name: 'set_model',
        log_message: 'Model selector button not found'
      })
      return
    }

    if (model_selector_button.textContent?.includes(model_label_to_find)) {
      return
    }

    model_selector_button.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true })
    )
    await new Promise((r) => requestAnimationFrame(r))

    const models_dropdown = document.querySelector(
      'div[data-floating-ui-focusable]'
    ) as HTMLElement
    if (!models_dropdown) {
      report_initialization_error({
        function_name: 'set_model',
        log_message: 'Models dropdown not found'
      })
      return
    }

    const options = models_dropdown.querySelectorAll('div[role="option"]')
    for (const option of Array.from(options)) {
      if (option.textContent?.startsWith(model_label_to_find)) {
        ;(option as HTMLElement).click()
        break
      }
    }
    await new Promise((r) => requestAnimationFrame(r))
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
        get_chat_turn: (f) => f.closest('div[data-testid="assistant-message"]'),
        perform_copy: (f) => {
          const copy_button = f.querySelector(
            'button:first-child'
          ) as HTMLElement
          if (!copy_button) {
            report_initialization_error({
              function_name: 'together.perform_copy',
              log_message: 'Copy button not found'
            })
            return
          }
          copy_button.click()
        },
        insert_button: (f, b) =>
          f.insertBefore(b, f.children[f.children.length])
      })
    }

    observe_for_responses({
      chatbot_name: 'Together',
      is_generating: () =>
        !!document.querySelector('button[data-testid="stop-button"]'),
      footer_selector: 'div[data-testid="assistant-message-toolbar"]',
      add_buttons
    })
  }
}
