import { CHATBOTS } from '@shared/constants/chatbots'
import { Chatbot } from '../types/chatbot'
import {
  add_apply_response_button,
  observe_for_responses
} from '../utils/add-apply-response-button'
import { report_initialization_error } from '../utils/report-initialization-error'

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
      if (!model_selector_trigger) {
        report_initialization_error({
          function_name: 'set_model',
          log_message: 'Model selector trigger not found',
          alert_message: 'Unable to set model'
        })
        return
      }
      model_selector_trigger.click()
      await new Promise((r) => requestAnimationFrame(r))
      const menu_content =
        document.querySelector('.mat-mdc-menu-content') ||
        document.querySelector('mat-action-list')
      if (!menu_content) {
        report_initialization_error({
          function_name: 'set_model',
          log_message: 'Model selector menu not found',
          alert_message: 'Unable to set model'
        })
        return
      }
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
  },
  set_options: async (options?: string[]) => {
    if (!options) return
    const supported_options = CHATBOTS['Gemini'].supported_options
    if (
      options.includes('temporary-chat') &&
      supported_options['temporary-chat']
    ) {
      const temp_chat_button_selector =
        'button[data-test-id="temp-chat-button"]'
      let temp_chat_button = document.querySelector(
        temp_chat_button_selector
      ) as HTMLButtonElement

      const side_nav_menu_button_selector =
        'button[data-test-id="side-nav-menu-button"]'
      let side_nav_menu_button_clicked = false

      if (!temp_chat_button) {
        const side_nav_menu_button = document.querySelector(
          side_nav_menu_button_selector
        ) as HTMLButtonElement
        if (side_nav_menu_button) {
          side_nav_menu_button.click()
          side_nav_menu_button_clicked = true
          await new Promise((resolve) => setTimeout(resolve, 500))
          temp_chat_button = document.querySelector(
            temp_chat_button_selector
          ) as HTMLButtonElement
        }
      }

      if (!temp_chat_button) {
        report_initialization_error({
          function_name: 'set_options',
          log_message: 'Temporary chat button not found',
          alert_message: 'Unable to set options'
        })
        return
      }

      temp_chat_button.click()
      await new Promise((r) => requestAnimationFrame(r))

      if (side_nav_menu_button_clicked) {
        const side_nav_menu_button = document.querySelector(
          side_nav_menu_button_selector
        ) as HTMLButtonElement
        if (!side_nav_menu_button) {
          report_initialization_error({
            function_name: 'set_options',
            log_message: 'Side nav menu button not found to close',
            alert_message: 'Unable to set options'
          })
          return
        }
        side_nav_menu_button.click()
        await new Promise((r) => requestAnimationFrame(r))
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
          if (!copy_button) {
            report_initialization_error({
              function_name: 'gemini.perform_copy',
              log_message: 'Copy button not found',
              alert_message: 'Unable to copy response'
            })
            return
          }
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
