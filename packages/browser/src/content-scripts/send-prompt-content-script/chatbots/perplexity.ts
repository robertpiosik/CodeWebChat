import { Chatbot } from '../types/chatbot'
import {
  add_apply_response_button,
  observe_for_responses
} from '../utils/add-apply-response-button'
import {
  InitializationError,
  report_initialization_error
} from '../utils/report-initialization-error'

export const perplexity: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => setTimeout(resolve, 500))
    ;(document.querySelector('[contenteditable="true"]') as any)?.click()
  },
  set_options: async (options?: string[]) => {
    if (!options) return

    if (options.includes('search')) {
      // Enabled by default
      return
    }

    const switcher_button = document.querySelector(
      'button[data-testid="sources-switcher-button"]'
    ) as HTMLButtonElement
    if (!switcher_button) {
      report_initialization_error({
        function_name: 'perplexity.set_options',
        log_message: 'Sources switcher button not found',
        alert_message: InitializationError.UNABLE_TO_SET_OPTIONS
      })
      return
    }

    switcher_button.click()
    await new Promise((r) => requestAnimationFrame(r))

    const web_toggle = document.querySelector(
      'div[data-testid="source-toggle-web"]'
    ) as HTMLElement
    if (web_toggle) {
      web_toggle.click()
    } else {
      report_initialization_error({
        function_name: 'perplexity.set_options',
        log_message: 'Web toggle button not found',
        alert_message: InitializationError.UNABLE_TO_SET_OPTIONS
      })
    }
  },
  enter_message_and_send: async (params) => {
    const input_element = document.querySelector(
      'div[contenteditable=true]'
    ) as HTMLElement
    if (!input_element) {
      report_initialization_error({
        function_name: 'enter_message_and_send',
        log_message: 'Message input not found',
        alert_message: InitializationError.UNABLE_TO_SEND_MESSAGE
      })
      return
    }

    input_element.dispatchEvent(
      new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: params.message
      })
    )

    await new Promise((r) => requestAnimationFrame(r))

    if (params.without_submission) return

    const submit_button = document.querySelector(
      'button[data-testid="submit-button"]'
    ) as HTMLButtonElement
    if (!submit_button) {
      report_initialization_error({
        function_name: 'enter_message_and_send',
        log_message: 'Submit button not found',
        alert_message: InitializationError.UNABLE_TO_SEND_MESSAGE
      })
      return
    }
    submit_button.click()
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
        get_chat_turn: (f) => f.closest('.max-w-threadContentWidth'),
        perform_copy: (f) => {
          const copy_button = f.querySelector(
            'button:nth-child(4)'
          ) as HTMLButtonElement
          if (!copy_button) {
            report_initialization_error({
              function_name: 'perplexity.perform_copy',
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

    observe_for_responses({
      chatbot_name: 'Perplexity',
      is_generating: () =>
        !!document.querySelector(
          'path[d="M17 4h-10a3 3 0 0 0 -3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3 -3v-10a3 3 0 0 0 -3 -3z"]'
        ),
      footer_selector:
        '.max-w-threadContentWidth > .relative > div > div > div > div > div + div > div + div',
      add_buttons
    })
  }
}
