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
    await new Promise((resolve) => {
      const check_for_element = () => {
        if (
          document.querySelector(
            'path[d="M8 8a3.5 3 0 0 1 3.5 -3h1a3.5 3 0 0 1 3.5 3a3 3 0 0 1 -2 3a3 4 0 0 0 -2 4"]'
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
  enter_message_and_send: async (
    message: string,
    without_submission?: boolean
  ) => {
    let instructions = message
    if (message.includes('<files>')) {
      instructions = message.split('<files>')[0].trim()
      const context = message.split('<files>')[1].split('</files>')[0].trim()

      // Upload file
      const file_input = document.querySelector(
        'input[type="file"]'
      ) as HTMLInputElement
      if (!file_input) {
        report_initialization_error({
          function_name: 'enter_message_and_send',
          log_message: 'File input not found',
          alert_message: InitializationError.UNABLE_TO_UPLOAD_FILE
        })
        return
      }
      const blob = new Blob([context], { type: 'text/plain' })
      const file = new File([blob], 'context.txt', { type: 'text/plain' })
      const data_transfer = new DataTransfer()
      data_transfer.items.add(file)
      file_input.files = data_transfer.files
      file_input.dispatchEvent(new Event('change', { bubbles: true }))
      await new Promise((r) => requestAnimationFrame(r))
      await new Promise((resolve) => {
        const check_for_element = () => {
          if (document.querySelector('svg.tabler-icon-file-text')) {
            resolve(null)
          } else {
            setTimeout(check_for_element, 100)
          }
        }
        check_for_element()
      })
    }

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
        data: instructions
      })
    )

    await new Promise((r) => requestAnimationFrame(r))

    if (without_submission) return

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
    raw_instructions?: string
  ) => {
    const add_buttons = (footer: Element) => {
      add_apply_response_button({
        client_id,
        raw_instructions,
        footer,
        get_chat_turn: (f) => f.closest('.max-w-threadContentWidth'),
        get_code_blocks: (t) => t.querySelectorAll('code'),
        perform_copy: (f) => {
          const buttons = f.querySelectorAll('button')
          const copy_button = Array.from(buttons).find((button) => {
            const path = button.querySelectorAll('path')
            return Array.from(path).some(
              (p) =>
                p.getAttribute('d') ==
                'M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1'
            )
          }) as HTMLElement
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
