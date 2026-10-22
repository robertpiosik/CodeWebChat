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
        if (document.querySelector('.is-empty')) {
          resolve(null)
        } else {
          setTimeout(check_for_element, 100)
        }
      }
      check_for_element()
    })
  },
  set_model: async (chat) => {
    const model = chat.model
    if (model && CHATBOTS['Grok'].models && model in CHATBOTS['Grok'].models) {
      const model_selector_trigger = document.querySelector(
        'button#model-select-trigger'
      ) as HTMLButtonElement
      if (!model_selector_trigger) {
        report_initialization_error({
          function_name: 'set_model',
          log_message: 'Model selector trigger not found'
        })
        return
      }

      const model_label = CHATBOTS['Grok'].models[model].label
      const target_label_lower = model_label.toLowerCase()

      model_selector_trigger.click()
      await new Promise((r) => requestAnimationFrame(r))

      const menu_items = Array.from(
        document.querySelectorAll(
          '[data-radix-menu-content] [role="menuitemradio"]'
        )
      )
      let found = false
      for (const item of menu_items) {
        const text = item.textContent?.trim().toLowerCase()
        if (text && text.includes(target_label_lower)) {
          const is_checked = item.getAttribute('aria-checked') === 'true'
          if (!is_checked) {
            ;(item as HTMLElement).click()
          }
          found = true
          break
        }
      }
      if (!found) {
        report_initialization_error({
          function_name: 'set_model',
          log_message: `Model option for "${model_label}" not found`
        })
      }
      await new Promise((r) => requestAnimationFrame(r))
    }
  },
  set_options: async (chat) => {
    const options = chat.options
    if (!options) return
    const supported_options = CHATBOTS['Grok'].supported_options
    for (const option of options) {
      if (option === 'private' && supported_options?.['private']) {
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
  enter_message: async (params) => {
    const input_element = document.querySelector(
      'div[contenteditable="true"]'
    ) as HTMLElement
    if (!input_element) {
      report_initialization_error({
        function_name: 'grok.enter_message',
        log_message: 'Message input not found'
      })
      return
    }

    input_element.innerText = params.message
    input_element.dispatchEvent(new Event('input', { bubbles: true }))
    input_element.focus()
  },
  setup_observer: (params) => {
    const add_buttons = (footer: Element) => {
      add_apply_response_button({
        client_id: params.client_id,
        raw_instructions: params.raw_instructions,
        footer,
        perform_copy: (f) => {
          const copy_button = f.querySelector(
            'button:first-child'
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
      add_buttons: params.inject_button ? add_buttons : undefined
    })
  }
}
