import { Chatbot } from '../types/chatbot'
import {
  add_apply_response_button,
  observe_for_responses
} from '../utils/add-apply-response-button'
import { report_initialization_error } from '../utils/report-initialization-error'

export const hugging_chat: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => setTimeout(resolve, 500))
  },
  set_reasoning_effort: async (chat) => {
    const effort_button = document.querySelector(
      'button[aria-label="Select thinking effort"]'
    ) as HTMLButtonElement

    if (!effort_button) {
      if (chat.reasoning_effort) {
        report_initialization_error({
          function_name: 'hugging_chat.set_reasoning_effort',
          log_message: 'Thinking effort button not found'
        })
      }
      return
    }

    const reasoning_effort = chat.reasoning_effort || 'default'

    if (
      effort_button.textContent
        ?.trim()
        .toLowerCase()
        .includes(reasoning_effort.toLowerCase())
    ) {
      return
    }

    effort_button.click()
    await new Promise((r) => requestAnimationFrame(r))

    const menu = await new Promise<Element | null>((resolve) => {
      let attempts = 0
      const check = () => {
        attempts++
        const el = document.querySelector('div[data-dropdown-menu-content]')
        if (el) {
          resolve(el)
        } else if (attempts > 50) {
          resolve(null)
        } else {
          setTimeout(check, 100)
        }
      }
      check()
    })

    if (!menu) {
      report_initialization_error({
        function_name: 'hugging_chat.set_reasoning_effort',
        log_message: 'Reasoning effort menu not found'
      })
      return
    }

    const options = Array.from(menu.querySelectorAll('div[role="menuitem"]'))
    let found = false
    for (const option of options) {
      if (
        option.textContent?.trim().toLowerCase() ==
        reasoning_effort.toLowerCase()
      ) {
        ;(option as HTMLElement).click()
        found = true
        break
      }
    }

    if (!found) {
      report_initialization_error({
        function_name: 'hugging_chat.set_reasoning_effort',
        log_message: `Reasoning effort option "${reasoning_effort}" not found`
      })
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      )
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  },
  set_model: async (chat) => {
    const model = chat.model
    if (!model) return

    const model_picker_button = document.querySelector(
      'form + div > a'
    ) as HTMLAnchorElement
    if (!model_picker_button) {
      report_initialization_error({
        function_name: 'hugging_chat.set_model',
        log_message: 'Model picker button not found'
      })
      return
    }

    if (model_picker_button.textContent.trim() == `Model: ${model}`) {
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
        log_message: 'Model picker dialog not found'
      })
      return
    }

    if (window.innerWidth < 768) {
      const back_button = document
        .querySelector('path[d="M10 16L20 6l1.4 1.4l-8.6 8.6l8.6 8.6L20 26z"]')
        ?.closest('button')
      if (back_button) {
        ;(back_button as HTMLElement).click()
        await new Promise((resolve) => setTimeout(resolve, 100))
      } else {
        report_initialization_error({
          function_name: 'hugging_chat.set_model',
          log_message: 'Back button not found on small screen'
        })
      }
    }

    const model_button = dialog.querySelector(
      `button[data-model-id="${model}"]`
    ) as HTMLButtonElement

    if (!model_button) {
      report_initialization_error({
        function_name: 'hugging_chat.set_model',
        log_message: `Model button for "${model}" not found`
      })

      const close_button = dialog.querySelector('button') as HTMLButtonElement
      if (close_button) {
        close_button.click()
      }
      return
    }

    model_button.click()
    await new Promise((resolve) => setTimeout(resolve, 250))

    const activate_button = dialog.querySelector(
      'button[name="Activate model"]'
    ) as HTMLButtonElement

    if (!activate_button) {
      report_initialization_error({
        function_name: 'hugging_chat.set_model',
        log_message: 'Activate model button not found'
      })
      return
    }

    activate_button.click()
    await new Promise((resolve) => setTimeout(resolve, 500))
  },
  enter_message: async (params) => {
    const input_element = document.querySelector(
      'textarea'
    ) as HTMLTextAreaElement
    if (!input_element) {
      report_initialization_error({
        function_name: 'hugging_chat.enter_message',
        log_message: 'Message input textarea not found'
      })
      return
    }
    input_element.value = params.message
    input_element.dispatchEvent(new Event('input', { bubbles: true }))
    input_element.focus()
  },
  setup_observer: (params) => {
    const add_buttons = (footer: Element) => {
      add_apply_response_button({
        client_id: params.client_id,
        raw_instructions: params.raw_instructions,
        footer,
        get_chat_turn: (f) => f.closest('div[data-message-role="assistant"]'),
        perform_copy: (f) => {
          const copy_button = f.querySelector(
            'button:nth-of-type(2)'
          ) as HTMLElement
          if (!copy_button) {
            report_initialization_error({
              function_name: 'hugging_chat.perform_copy',
              log_message: 'Copy button not found'
            })
            return
          }
          copy_button.click()
        },
        insert_button: (f, b) => f.insertBefore(b, f.children[0])
      })
    }

    observe_for_responses({
      chatbot_name: 'HuggingChat',
      is_generating: () =>
        !!document.querySelector('button.stop-generating-btn'),
      footer_selector: 'div[data-message-role="assistant"] > div:nth-child(3)',
      add_buttons: params.inject_button ? add_buttons : undefined
    })
  }
}
