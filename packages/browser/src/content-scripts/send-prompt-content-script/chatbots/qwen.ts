import { CHATBOTS } from '@shared/constants/chatbots'
import { Chatbot } from '../types/chatbot'
import {
  add_apply_response_button,
  observe_for_responses
} from '../utils/add-apply-response-button'
import {
  InitializationError,
  report_initialization_error
} from '../utils/report-initialization-error'

export const qwen: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        const model_selector_button = document.querySelector(
          'button#model-selector-0-button'
        ) as HTMLElement

        if (
          model_selector_button &&
          model_selector_button.textContent &&
          Object.values(CHATBOTS['Qwen'].models)
            .map((model) => model.label)
            .includes(model_selector_button.textContent.trim())
        ) {
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
      'button#model-selector-0-button'
    ) as HTMLElement
    if (!model_selector_button) {
      report_initialization_error({
        function_name: 'set_model',
        log_message: 'Model selector button not found',
        alert_message: InitializationError.UNABLE_TO_SET_MODEL
      })
      return
    }

    if (
      model_selector_button.textContent?.trim() ==
      (CHATBOTS['Qwen'].models as any)[model]?.label
    ) {
      return
    }

    model_selector_button.click()
    await new Promise((r) => requestAnimationFrame(r))
    const expand_more = document.querySelector(
      'div[aria-labelledby="model-selector-0-button"] div.expand-more'
    ) as HTMLElement
    if (expand_more) {
      expand_more.click()
      await new Promise((r) => setTimeout(r, 300))
    } else {
      report_initialization_error({
        function_name: 'set_model',
        log_message: 'Expand more button not found',
        alert_message: InitializationError.UNABLE_TO_SET_MODEL
      })
      return
    }
    const model_buttons = document.querySelectorAll(
      'div[aria-labelledby="model-selector-0-button"] button[aria-label="model-item"]'
    ) as NodeListOf<HTMLButtonElement>
    for (const button of Array.from(model_buttons)) {
      const model_name_element = (button.querySelector('div.text-sm') ||
        button.querySelector('div.text-15')) as HTMLDivElement
      if (
        model_name_element &&
        model_name_element.textContent ===
          (CHATBOTS['Qwen'].models as any)[model]?.label
      ) {
        button.click()
        break
      }
    }
    await new Promise((r) => requestAnimationFrame(r))
  },
  set_options: async (options?: string[]) => {
    if (!options) return
    const supported_options = CHATBOTS['Qwen'].supported_options
    for (const option of options) {
      if (option == 'thinking' && supported_options['thinking']) {
        const buttons = document.querySelectorAll(
          '.chat-message-input button.chat-input-feature-btn'
        ) as NodeListOf<HTMLButtonElement>
        for (const button of Array.from(buttons)) {
          if (button.querySelector('i.icon-line-deepthink-01')) {
            button.click()
          }
        }
      } else if (option == 'search' && supported_options['search']) {
        const search_button = document.querySelector(
          'button.websearch_button'
        ) as HTMLButtonElement
        if (!search_button) {
          report_initialization_error({
            function_name: 'set_options',
            log_message: 'Search button not found',
            alert_message: InitializationError.UNABLE_TO_SET_OPTIONS
          })
          return
        }
        search_button.click()
      } else if (option == 'temporary' && supported_options['temporary']) {
        const model_selector_button = document.querySelector(
          'button#model-selector-0-button'
        ) as HTMLElement
        if (!model_selector_button) {
          report_initialization_error({
            function_name: 'set_options',
            log_message: 'Model selector button for temporary chat not found',
            alert_message: InitializationError.UNABLE_TO_SET_OPTIONS
          })
          return
        }
        model_selector_button.click()
        await new Promise((r) => requestAnimationFrame(r))
        const temporary_switch = document.querySelector(
          'div[aria-labelledby="model-selector-0-button"] button[role="switch"]'
        ) as HTMLButtonElement
        if (!temporary_switch) {
          report_initialization_error({
            function_name: 'set_options',
            log_message: 'Temporary chat switch not found',
            alert_message: InitializationError.UNABLE_TO_SET_OPTIONS
          })
          return
        }
        temporary_switch.click()
        await new Promise((r) => requestAnimationFrame(r))
        model_selector_button.click()
        await new Promise((r) => requestAnimationFrame(r))
      }
    }
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
        'input#filesUpload'
      ) as HTMLInputElement
      if (!file_input) {
        report_initialization_error({
          function_name: 'enter_message_and_send',
          log_message: 'File input not found',
          alert_message: InitializationError.UNABLE_TO_SEND_MESSAGE_WITH_FILE
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
          if (document.querySelector('i.icontxt1')) {
            resolve(null)
          } else {
            setTimeout(check_for_element, 100)
          }
        }
        check_for_element()
      })
    }

    // Enter instructions
    const input_element = document.querySelector(
      'textarea'
    ) as HTMLTextAreaElement
    if (!input_element) {
      report_initialization_error({
        function_name: 'enter_message_and_send',
        log_message: 'Message input textarea not found',
        alert_message: InitializationError.UNABLE_TO_SEND_MESSAGE
      })
      return
    }
    input_element.value = instructions
    input_element.dispatchEvent(new Event('input', { bubbles: true }))
    input_element.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise((r) => requestAnimationFrame(r))

    if (without_submission) return

    // Submit
    const submit_button = document.querySelector(
      'button#send-message-button'
    ) as HTMLButtonElement
    if (!submit_button) {
      report_initialization_error({
        function_name: 'enter_message_and_send',
        log_message: 'Send button not found',
        alert_message: InitializationError.UNABLE_TO_SEND_MESSAGE
      })
      return
    }
    submit_button.click()
  },
  inject_apply_response_button: (client_id: number) => {
    const add_buttons = (footer: Element) => {
      add_apply_response_button({
        client_id,
        footer,
        get_chat_turn: (f) =>
          f.parentElement?.parentElement?.querySelector(
            '#response-content-container'
          ) as HTMLElement,
        get_code_blocks: (t) => t.querySelectorAll('.cm-content'),
        get_code_from_block: (b) => b.querySelector('.cm-line')?.textContent,
        perform_copy: (f) => {
          const copy_button = f.querySelector(
            'button.copy-response-button'
          ) as HTMLElement
          if (!copy_button) {
            report_initialization_error({
              function_name: 'qwen.perform_copy',
              log_message: 'Copy button not found',
              alert_message: InitializationError.UNABLE_TO_COPY_RESPONSE
            })
            return
          }
          if (!copy_button) {
            report_initialization_error({
              function_name: 'qwen.perform_copy',
              log_message: 'Copy button not found',
              alert_message: InitializationError.UNABLE_TO_COPY_RESPONSE
            })
            return
          }
          copy_button.click()
        },
        insert_button: (f, b) => f.insertBefore(b, f.children[0]),
        customize_button: (b) => (b.style.order = '7')
      })
    }

    observe_for_responses({
      chatbot_name: 'Qwen',
      is_generating: () => !!document.querySelector('i.icon-StopIcon'),
      footer_selector: '.message-footer-buttons',
      add_buttons
    })
  }
}
