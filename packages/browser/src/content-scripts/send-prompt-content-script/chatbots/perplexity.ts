import { Chatbot } from '../types/chatbot'
import { CHATBOTS } from '@shared/constants/chatbots'
import {
  add_apply_response_button,
  observe_for_responses
} from '../utils/add-apply-response-button'
import { report_initialization_error } from '../utils/report-initialization-error'

export const perplexity: Chatbot = {
  wait_until_ready: async () => {
    const url = new URL(window.location.href)
    if (url.pathname != '/') {
      // User used custom path url for a "space"
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
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
    if (window.innerWidth <= 768) {
      ;(document.querySelector('[contenteditable="true"]') as any)?.click()
    }
  },
  set_model: async (chat) => {
    const model = chat.model
    if (!model) return

    const model_button = document.querySelector(
      'input[multiple] + button + div button'
    ) as HTMLButtonElement
    if (!model_button) {
      report_initialization_error({
        function_name: 'set_model',
        log_message: 'Model selector button not found'
      })
      return
    }

    const model_label_to_find = CHATBOTS['Perplexity'].models?.[model]?.label
    if (!model_label_to_find) {
      report_initialization_error({
        function_name: 'set_model',
        log_message: `Model "${model}" not found in config`
      })
      return
    }

    model_button.click()
    await new Promise((r) => requestAnimationFrame(r))

    let dropdown = document.querySelector(
      'div[data-type="portal"] div[role="menu"]'
    )
    if (!dropdown) {
      report_initialization_error({
        function_name: 'set_model',
        log_message: 'Model selector dropdown not found'
      })
      return
    }

    const menu_items = dropdown.querySelectorAll('div[role="menuitem"]')
    let found = false
    for (const item of Array.from(menu_items)) {
      if (item.textContent?.includes(model_label_to_find)) {
        ;(item as HTMLElement).click()
        await new Promise((r) => requestAnimationFrame(r))
        found = true
        break
      }
    }

    if (!found) {
      report_initialization_error({
        function_name: 'set_model',
        log_message: `Model option "${model_label_to_find}" not found`
      })
    }

    const options = chat.options
    const should_enable_reasoning =
      options?.includes('with-reasoning') &&
      !CHATBOTS['Perplexity'].models?.[model]?.disabled_options?.includes(
        'with-reasoning'
      )

    // Reassign because the dropdown re-rendered
    dropdown = document.querySelector(
      'div[data-type="portal"] div[role="menu"]'
    )!

    const switch_button = dropdown.querySelector(
      'button[role="switch"]'
    ) as HTMLElement

    if (switch_button) {
      const is_checked = switch_button.getAttribute('aria-checked') == 'true'
      if (!!should_enable_reasoning != is_checked) {
        switch_button.click()
        await new Promise((r) => requestAnimationFrame(r))
      }
    }

    model_button.click()
    await new Promise((r) => requestAnimationFrame(r))
  },
  set_options: async (chat) => {
    const options = chat.options

    if (options && options.includes('search')) {
      // Enabled by default
      return
    }

    const switcher_button = document.querySelector(
      'input[multiple] + button'
    ) as HTMLButtonElement
    if (!switcher_button) {
      report_initialization_error({
        function_name: 'perplexity.set_options',
        log_message: 'Sources switcher button not found'
      })
      return
    }

    switcher_button.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true })
    )
    await new Promise((r) => requestAnimationFrame(r))

    const web_toggle = document.querySelector(
      'div[data-testid="sources-menu-suggested-sources"] > div button'
    ) as HTMLElement
    if (web_toggle) {
      web_toggle.click()
    } else {
      report_initialization_error({
        function_name: 'perplexity.set_options',
        log_message: 'Web toggle button not found'
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
        log_message: 'Message input not found'
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
        log_message: 'Submit button not found'
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
            'button:nth-child(3)'
          ) as HTMLButtonElement
          if (!copy_button) {
            report_initialization_error({
              function_name: 'perplexity.perform_copy',
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
      chatbot_name: 'Perplexity',
      is_generating: () =>
        !!document.querySelector(
          'button[data-testid="stop-generating-response-button"]'
        ),
      footer_selector:
        '.relative.font-sans + div > div.items-center:first-child',
      add_buttons
    })
  }
}
