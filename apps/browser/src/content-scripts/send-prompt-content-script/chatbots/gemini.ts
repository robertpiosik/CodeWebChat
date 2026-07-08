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
        if (
          document.querySelector('button[data-test-id="bard-mode-menu-button"]')
        ) {
          resolve(null)
        } else {
          setTimeout(check_for_element, 100)
        }
      }
      check_for_element()
    })
    await new Promise((resolve) => setTimeout(resolve, 500))
  },
  set_model: async (chat) => {
    const model = chat.model
    if (
      model &&
      CHATBOTS['Gemini'].models &&
      model in CHATBOTS['Gemini'].models
    ) {
      const model_selector_trigger = document.querySelector(
        'bard-mode-switcher button'
      ) as HTMLButtonElement
      if (!model_selector_trigger) {
        report_initialization_error({
          function_name: 'set_model',
          log_message: 'Model selector trigger not found'
        })
        return
      }

      const model_label = CHATBOTS['Gemini'].models[model].label
      const trigger_text =
        model_selector_trigger.textContent?.trim().toLowerCase() || ''
      const target_label_lower = model_label.toLowerCase()
      if (
        trigger_text.includes(target_label_lower) &&
        !(target_label_lower == 'flash' && trigger_text.includes('flash-lite'))
      ) {
        return
      }

      model_selector_trigger.click()
      await new Promise((r) => requestAnimationFrame(r))
      const menu_content = document.querySelector('gem-menu')
      if (!menu_content) {
        report_initialization_error({
          function_name: 'set_model',
          log_message: 'Model selector menu not found'
        })
        return
      }
      const model_options = Array.from(
        menu_content.querySelectorAll('[role="menuitem"]')
      )
      let found = false
      for (const option of model_options) {
        const label_element = option.querySelector('.label')
        const text = label_element?.textContent?.trim().toLowerCase()
        if (text && text.endsWith(target_label_lower)) {
          ;(option as HTMLElement).click()
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
  set_reasoning_effort: async (chat) => {
    const reasoning_effort = chat.reasoning_effort
    if (!reasoning_effort) return

    const model_selector_trigger = document.querySelector(
      'bard-mode-switcher button'
    ) as HTMLButtonElement
    if (!model_selector_trigger) {
      report_initialization_error({
        function_name: 'set_reasoning_effort',
        log_message: 'Model selector trigger not found'
      })
      return
    }

    model_selector_trigger.click()
    await new Promise((resolve) => requestAnimationFrame(resolve))

    const menu_content = document.querySelector('gem-menu')
    if (!menu_content) {
      report_initialization_error({
        function_name: 'set_reasoning_effort',
        log_message: 'Model selector menu not found'
      })
      return
    }

    const all_menu_items = Array.from(
      menu_content.querySelectorAll('gem-menu-item')
    )

    const extended_thinking_item = all_menu_items.find(
      (item) =>
        item.querySelector('.label')?.textContent?.trim().toLowerCase() ==
        'extended thinking'
    ) as HTMLElement

    if (!extended_thinking_item) {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      )
      return
    }

    const is_extended = extended_thinking_item.classList.contains('selected')
    const target_is_extended = reasoning_effort.toLowerCase() == 'extended'

    if (is_extended !== target_is_extended) {
      extended_thinking_item.click()
    } else {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      )
    }

    await new Promise((resolve) => requestAnimationFrame(resolve))
  },
  set_options: async (chat) => {
    const options = chat.options
    if (!options) return
    const supported_options = CHATBOTS['Gemini'].supported_options
    if (
      options.includes('temporary-chat') &&
      supported_options?.['temporary-chat']
    ) {
      const temp_chat_button_selector = 'temp-chat-button button'
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
          log_message: 'Temporary chat button not found'
        })
        return
      }

      temp_chat_button.click()
      await new Promise((r) => requestAnimationFrame(r))

      if (side_nav_menu_button_clicked && window.innerWidth >= 960) {
        const side_nav_menu_button = document.querySelector(
          side_nav_menu_button_selector
        ) as HTMLButtonElement
        if (!side_nav_menu_button) {
          report_initialization_error({
            function_name: 'set_options',
            log_message: 'Side nav menu button not found to close'
          })
          return
        }
        side_nav_menu_button.click()
        await new Promise((r) => requestAnimationFrame(r))
      }
    }
  },
  enter_message: async (params) => {
    const input_element = document.querySelector(
      'div[contenteditable="true"]'
    ) as HTMLElement

    if (!input_element) {
      report_initialization_error({
        function_name: 'gemini.enter_message',
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
        edit_format: params.edit_format,
        footer,
        get_chat_turn: (f) => f.closest('response-container'),
        perform_copy: (f) => {
          const copy_button = f.querySelector(
            'copy-button button'
          ) as HTMLElement
          if (!copy_button) {
            report_initialization_error({
              function_name: 'gemini.perform_copy',
              log_message: 'Copy button not found'
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
        !!document.querySelector('mat-icon[fonticon="stop"]'),
      footer_selector: 'message-actions > div > div',
      add_buttons: params.inject_button ? add_buttons : undefined
    })
  }
}
