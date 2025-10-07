import { Chatbot } from '../types/chatbot'
import {
  add_apply_response_button,
  observe_for_responses
} from '../utils/add-apply-response-button'
import {
  InitializationError,
  report_initialization_error
} from '../utils/report-initialization-error'

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

    if (
      options.includes('incognito') &&
      !window.location.pathname.includes('/incognito')
    ) {
      const incognito_button = document.querySelector(
        'a[href="/incognito"]'
      ) as HTMLAnchorElement
      if (incognito_button) {
        incognito_button.click()
        await new Promise((resolve) => setTimeout(resolve, 500))
      } else {
        report_initialization_error({
          function_name: 'set_options',
          log_message: 'Incognito button not found',
          alert_message: InitializationError.UNABLE_TO_SET_OPTIONS
        })
      }
    }

    const think_button_icon_path = document.querySelector(
      'path[d="M9 18h6"]'
    ) as SVGPathElement

    if (!think_button_icon_path) {
      report_initialization_error({
        function_name: 'set_options',
        log_message: 'Think button icon not found',
        alert_message: InitializationError.UNABLE_TO_SET_OPTIONS
      })
      return
    }

    const think_button = think_button_icon_path.closest(
      'button'
    ) as HTMLButtonElement

    if (!think_button) {
      report_initialization_error({
        function_name: 'set_options',
        log_message: 'Think button not found',
        alert_message: InitializationError.UNABLE_TO_SET_OPTIONS
      })
      return
    }

    const should_be_on = options.includes('think')
    const is_on = think_button.getAttribute('data-state') == 'on'

    if (should_be_on != is_on) {
      think_button.click()
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
        get_chat_turn: (f) =>
          f.parentElement?.parentElement?.querySelector(
            'div[data-message-part-type="answer"]'
          ) as HTMLElement,
        get_code_blocks: (t) => t.querySelectorAll('code'),
        perform_copy: (f) => {
          const copy_button = f.querySelector(
            'button:last-child'
          ) as HTMLElement
          if (!copy_button) {
            report_initialization_error({
              function_name: 'mistral.perform_copy',
              log_message: 'Copy button not found',
              alert_message: InitializationError.UNABLE_TO_COPY_RESPONSE
            })
            return
          }
          if (!copy_button) {
            report_initialization_error({
              function_name: 'mistral.perform_copy',
              log_message: 'Copy button not found',
              alert_message: InitializationError.UNABLE_TO_COPY_RESPONSE
            })
            return
          }
          copy_button.click()
        },
        insert_button: (f, b) => f.insertBefore(b, f.children[0])
      })
    }

    const footer_selector =
      'div[data-message-author-role="assistant"] > div:last-child > div:last-child > div:last-child'

    requestAnimationFrame(() => {
      observe_for_responses({
        chatbot_name: 'Mistral',
        is_generating: () =>
          !document.querySelector(footer_selector) ||
          !!document.querySelector('form rect[rx="2"]'),
        footer_selector,
        add_buttons
      })
    })
  }
}
