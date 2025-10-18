import { Chatbot } from '../types/chatbot'
import {
  add_apply_response_button,
  observe_for_responses
} from '../utils/add-apply-response-button'
import {
  InitializationError,
  report_initialization_error
} from '../utils/report-initialization-error'

export const hugging_chat: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => setTimeout(resolve, 500))
  },
  set_model: async (model?: string) => {
    if (!model) return

    const model_picker_button = document.querySelector(
      'form + div > a'
    ) as HTMLAnchorElement
    if (!model_picker_button) {
      report_initialization_error({
        function_name: 'hugging_chat.set_model',
        log_message: 'Model picker button not found',
        alert_message: InitializationError.UNABLE_TO_SET_MODEL
      })
      return
    }

    model_picker_button.click()
    await new Promise((r) => requestAnimationFrame(r))

    const dialog = await new Promise<Element | null>((resolve) => {
      const check = () => {
        const el = document.querySelector('div[role="dialog"]')
        if (el) {
          resolve(el)
        } else {
          setTimeout(check, 100)
        }
      }
      check()
    })

    if (!dialog) {
      report_initialization_error({
        function_name: 'hugging_chat.set_model',
        log_message: 'Model picker dialog not found',
        alert_message: InitializationError.UNABLE_TO_SET_MODEL
      })
      return
    }

    const model_button = dialog.querySelector(
      `button[data-model-id="${model}"]`
    ) as HTMLButtonElement

    if (!model_button) {
      report_initialization_error({
        function_name: 'hugging_chat.set_model',
        log_message: `Model button for "${model}" not found`,
        alert_message: InitializationError.UNABLE_TO_SET_MODEL
      })

      const close_button = dialog.querySelector('button') as HTMLButtonElement
      if (close_button) {
        close_button.click()
      }
      return
    }

    model_button.click()
    await new Promise((r) => requestAnimationFrame(r))

    const activate_button = dialog.querySelector(
      'button[name="Activate model"]'
    ) as HTMLButtonElement

    if (!activate_button) {
      report_initialization_error({
        function_name: 'hugging_chat.set_model',
        log_message: 'Activate model button not found',
        alert_message: InitializationError.UNABLE_TO_SET_MODEL
      })
      return
    }

    activate_button.click()
    await new Promise((resolve) => setTimeout(resolve, 500))
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
        get_chat_turn: (f) => f.closest('div[data-message-role="assistant"]'),
        perform_copy: (f) => {
          const copy_button = f.querySelector(
            'button:nth-child(3)'
          ) as HTMLElement
          if (!copy_button) {
            report_initialization_error({
              function_name: 'hugging_chat.perform_copy',
              log_message: 'Copy button not found',
              alert_message: InitializationError.UNABLE_TO_COPY_RESPONSE
            })
            return
          }
          copy_button.click()
        },
        insert_button: (f, b) => f.insertBefore(b, f.children[1])
      })
    }

    observe_for_responses({
      chatbot_name: 'HuggingChat',
      is_generating: () =>
        !!document.querySelector('button.stop-generating-btn'),
      footer_selector: 'div[data-message-role="assistant"] > div:nth-child(3)',
      add_buttons
    })
  }
}
