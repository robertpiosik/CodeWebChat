import { CHATBOTS } from '@shared/constants/chatbots'
import { Chatbot } from '../types/chatbot'
import {
  add_apply_response_button,
  observe_for_responses
} from '../utils/add-apply-response-button'

export const gemini: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        if (document.querySelector('toolbox-drawer')) {
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
    if (model && model in CHATBOTS['Gemini'].models) {
      const model_selector_trigger = document.querySelector(
        'bard-logo + button'
      ) as HTMLButtonElement
      if (model_selector_trigger) {
        model_selector_trigger.click()
        await new Promise((r) => requestAnimationFrame(r))
        const menu_content =
          document.querySelector('.mat-mdc-menu-content') ||
          document.querySelector('mat-action-list')
        if (menu_content) {
          const model_options = Array.from(
            menu_content.querySelectorAll('button[mat-menu-item]')
          )
          for (const option of model_options) {
            const name_element = option.querySelector(
              '.title-and-description > span:last-child'
            )
            if (
              name_element &&
              name_element.textContent?.trim() ==
                (CHATBOTS['Gemini'].models as any)[model].label
            ) {
              ;(option as HTMLElement).click()
              await new Promise((r) => requestAnimationFrame(r))
              break
            }
          }
        }
      }
    }
  },
  inject_apply_response_button: (client_id: number) => {
    const add_buttons = (footer: Element) => {
      add_apply_response_button({
        client_id,
        footer,
        get_chat_turn: (f) => f.closest('response-container'),
        get_code_blocks: (t) => t.querySelectorAll('code'),
        perform_copy: (f) => {
          const copy_button = f.querySelector(
            'copy-button > button'
          ) as HTMLElement
          copy_button.click()
        },
        insert_button: (f, b) =>
          f.insertBefore(b, f.children[f.children.length - 1])
      })
    }

    observe_for_responses({
      chatbot_name: 'Gemini',
      is_generating: () =>
        !!document.querySelector('mat-icon[data-mat-icon-name="stop"]'),
      footer_selector: 'message-actions > div > div',
      add_buttons
    })
  }
}
