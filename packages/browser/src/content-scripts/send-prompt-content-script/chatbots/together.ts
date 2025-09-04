import { Chatbot } from '../types/chatbot'
import browser from 'webextension-polyfill'
import { show_response_ready_notification } from '../utils/show-response-ready-notification'
import { CHATBOTS } from '@shared/constants/chatbots'
import { add_apply_response_button } from '../utils/add-apply-response-button'

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

    const model_label_to_find = (CHATBOTS['Together'].models as any)[model]
      ?.label
    if (!model_label_to_find) return

    const model_selector_button = document.querySelector(
      'button[aria-haspopup="listbox"]'
    ) as HTMLButtonElement

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

    const options = models_dropdown.querySelectorAll('div[role="option"]')
    for (const option of Array.from(options)) {
      if (option.textContent?.startsWith(model_label_to_find)) {
        ;(option as HTMLElement).click()
        break
      }
    }
    await new Promise((r) => requestAnimationFrame(r))
  },
  inject_apply_response_button: (client_id: number) => {
    const add_buttons = (footer: Element) => {
      add_apply_response_button({
        client_id,
        footer,
        get_chat_turn: (f) => f.closest('div[data-testid="assistant-message"]'),
        get_code_blocks: (t) => t.querySelectorAll('code'),
        perform_copy: (f) => {
          const copy_button = f.querySelector(
            'button:first-child'
          ) as HTMLElement
          copy_button.click()
        },
        insert_button: (f, b) =>
          f.insertBefore(b, f.children[f.children.length])
      })
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach(() => {
        if (
          document.querySelector('button[data-testid="stop-button"]') ||
          !document.querySelector(
            'div[data-testid="assistant-message-toolbar"]'
          )
        ) {
          return
        }

        show_response_ready_notification({ chatbot_name: 'Together' })

        const all_footers = document.querySelectorAll(
          'div[data-testid="assistant-message-toolbar"]'
        )
        all_footers.forEach((footer) => {
          add_buttons(footer)
        })
      })
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    })
  }
}
