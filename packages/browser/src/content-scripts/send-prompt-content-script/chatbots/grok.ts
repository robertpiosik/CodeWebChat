import { Chatbot } from '../types/chatbot'
import { CHATBOTS } from '@shared/constants/chatbots'
import {
  add_apply_response_button,
  observe_for_responses
} from '../utils/add-apply-response-button'
import { report_initialization_error } from '../utils/report-initialization-error'

export const grok: Chatbot = {
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
  set_options: async (options?: string[]) => {
    if (!options) return
    const supported_options = CHATBOTS['Grok'].supported_options
    for (const option of options) {
      if (option == 'private' && supported_options?.['private']) {
        const private_link = document.querySelector(
          'a[href="/c#private"]'
        ) as HTMLAnchorElement
        if (!private_link) {
          report_initialization_error({
            function_name: 'set_options',
            log_message: 'Private mode link not found'
          })
          return
        }
        private_link.click()
      }
    }
  },
  set_model: async (model?: string) => {
    if (!model) return

    const model_selector_button = document.querySelector(
      'button[id="model-select-trigger"]'
    ) as HTMLButtonElement
    if (!model_selector_button) {
      report_initialization_error({
        function_name: 'set_model',
        log_message: 'Model selector button not found'
      })
      return
    }

    const model_label_to_find = CHATBOTS['Grok'].models?.[model]?.label
    if (!model_label_to_find) return

    if (model_selector_button.textContent?.includes(model_label_to_find)) {
      return
    }

    model_selector_button.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true })
    )
    await new Promise((r) => requestAnimationFrame(r))

    const dropdown = document.querySelector(
      'div[data-radix-popper-content-wrapper]'
    ) as HTMLDivElement
    if (!dropdown) {
      report_initialization_error({
        function_name: 'set_model',
        log_message: 'Model dropdown not found'
      })
      return
    }

    const options = dropdown.querySelectorAll('div[role="menuitem"]')
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
        get_chat_turn: (f) => f.closest('.items-start'),
        perform_copy: (f) => {
          const copy_button = f.querySelector(
            'button:nth-child(4)'
          ) as HTMLElement
          if (!copy_button) {
            report_initialization_error({
              function_name: 'grok.perform_copy',
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
      chatbot_name: 'Grok',
      is_generating: () =>
        !!document.querySelector(
          'path[d="M4 9.2v5.6c0 1.116 0 1.673.11 2.134a4 4 0 0 0 2.956 2.956c.46.11 1.018.11 2.134.11h5.6c1.116 0 1.673 0 2.134-.11a4 4 0 0 0 2.956-2.956c.11-.46.11-1.018.11-2.134V9.2c0-1.116 0-1.673-.11-2.134a4 4 0 0 0-2.956-2.955C16.474 4 15.916 4 14.8 4H9.2c-1.116 0-1.673 0-2.134.11a4 4 0 0 0-2.955 2.956C4 7.526 4 8.084 4 9.2Z"]'
        ),
      footer_selector: 'div.items-start div.action-buttons > div',
      add_buttons
    })
  }
}
