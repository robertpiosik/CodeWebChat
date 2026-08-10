import { Chatbot } from '../types/chatbot'
import {
  add_apply_response_button,
  observe_for_responses
} from '../utils/add-apply-response-button'
import { report_initialization_error } from '../utils/report-initialization-error'

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
  set_options: async (chat) => {
    const options = chat.options

    if (
      options?.includes('incognito') &&
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
          log_message: 'Incognito button not found'
        })
      }
    }

    const mode_toggler_icon_path = document.querySelector(
      'form path[d="M16 10.5L12 14.5L8 10.5"]'
    ) as SVGPathElement

    if (!mode_toggler_icon_path) {
      report_initialization_error({
        function_name: 'set_options',
        log_message: 'Think button icon not found'
      })
      return
    }

    const mode_toggler = mode_toggler_icon_path.closest(
      'button'
    ) as HTMLButtonElement

    if (!mode_toggler) {
      report_initialization_error({
        function_name: 'set_options',
        log_message: 'Think button not found'
      })
      return
    }

    mode_toggler.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    await new Promise((resolve) => requestAnimationFrame(resolve))

    const menuitems = document.querySelectorAll('div[role="menuitem"]')

    if (options?.includes('think')) {
      const think_item = menuitems[1] as HTMLElement
      if (think_item) {
        think_item.click()
        await new Promise((resolve) => requestAnimationFrame(resolve))
      } else {
        report_initialization_error({
          function_name: 'set_options',
          log_message: 'Think menu item not found'
        })
      }
    } else {
      const fast_item = menuitems[0] as HTMLElement
      if (fast_item) {
        fast_item.click()
        await new Promise((resolve) => requestAnimationFrame(resolve))
      } else {
        report_initialization_error({
          function_name: 'set_options',
          log_message: 'Fast menu item not found'
        })
      }
    }
  },
  enter_message: async (params) => {
    const input_element = document.querySelector(
      'div[contenteditable="true"]'
    ) as HTMLElement
    if (!input_element) {
      report_initialization_error({
        function_name: 'mistral.enter_message',
        log_message: 'Message input not found'
      })
      return
    }

    input_element.textContent = params.message
    input_element.dispatchEvent(new Event('input', { bubbles: true }))
    await new Promise((r) => requestAnimationFrame(r))
  },
  setup_observer: (params) => {
    const add_buttons = (footer: Element) => {
      add_apply_response_button({
        client_id: params.client_id,
        raw_instructions: params.raw_instructions,
        footer,
        perform_copy: (f) => {
          const copy_button = f.querySelector(
            'button:nth-child(6)'
          ) as HTMLElement
          if (!copy_button) {
            report_initialization_error({
              function_name: 'mistral.perform_copy',
              log_message: 'Copy button not found'
            })
            return
          }
          if (!copy_button) {
            report_initialization_error({
              function_name: 'mistral.perform_copy',
              log_message: 'Copy button not found'
            })
            return
          }
          copy_button.click()
        },
        insert_button: (f, b) => f.insertBefore(b, f.children[0])
      })
    }

    const footer_selector =
      'div[data-message-author-role="assistant"] > div + div > div:last-child > div:first-child'

    requestAnimationFrame(() => {
      observe_for_responses({
        chatbot_name: 'Mistral',
        is_generating: () =>
          !document.querySelector(footer_selector) ||
          !!document.querySelector('form rect[rx="2"]'),
        footer_selector,
        add_buttons: params.inject_button ? add_buttons : undefined
      })
    })
  }
}
