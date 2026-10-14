import { CHATBOTS } from '@shared/constants/chatbots'
import { Chatbot } from '../types/chatbot'
import {
  add_apply_response_button,
  observe_for_responses
} from '../utils/add-apply-response-button'
import { report_initialization_error } from '../utils/report-initialization-error'

export const chatgpt: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        const input_element = document.querySelector(
          'div[contenteditable="true"]'
        ) as HTMLElement

        // const thread_header_button = document.querySelector(
        //   'div[data-testid="thread-header-right-actions"] > div:first-child button'
        // )

        // const reasoning_effort_button = document.querySelector(
        //   'div[data-composer-transition-slot="trailing"] > div:first-child button'
        // )

        const is_ready = true
        // thread_header_button !== null || reasoning_effort_button !== null

        if (input_element && is_ready) {
          input_element.innerText = ' '
          input_element.dispatchEvent(new Event('input', { bubbles: true }))

          if (input_element.innerText == ' ') {
            resolve(null)
            return
          }
        }

        setTimeout(check_for_element, 100)
      }
      check_for_element()
    })
    await new Promise((resolve) => setTimeout(resolve, 500))
  },
  set_reasoning_effort: async (chat) => {
    const reasoning_effort = chat.reasoning_effort
    if (!reasoning_effort) return

    const reasoning_effort_values: Record<string, number> = {
      instant: 0,
      medium: 1,
      high: 2
    }

    const target_value = reasoning_effort_values[reasoning_effort.toLowerCase()]

    if (target_value === undefined) {
      report_initialization_error({
        function_name: 'set_reasoning_effort',
        log_message: `Unsupported reasoning effort "${reasoning_effort}"`
      })
      return
    }

    const reasoning_effort_button = document.querySelector(
      'div[data-composer-transition-slot="trailing"] > div:first-child button'
    ) as HTMLButtonElement

    if (!reasoning_effort_button) {
      report_initialization_error({
        function_name: 'set_reasoning_effort',
        log_message: 'Reasoning effort button not found'
      })
      return
    }

    reasoning_effort_button.dispatchEvent(
      new PointerEvent('pointerdown', {
        bubbles: true
      })
    )

    await new Promise((resolve) => setTimeout(resolve, 500))

    const slider = document.querySelector(
      '[data-model-reasoning-effort-slider] [role="slider"]'
    ) as HTMLElement

    if (!slider) {
      report_initialization_error({
        function_name: 'set_reasoning_effort',
        log_message: 'Reasoning effort slider not found'
      })
      return
    }

    const slider_control = slider.closest('[role="menuitem"]') as HTMLElement

    if (!slider_control) {
      report_initialization_error({
        function_name: 'set_reasoning_effort',
        log_message: 'Reasoning effort slider control not found'
      })
      return
    }

    const current_value = Number(slider.getAttribute('aria-valuenow'))

    if (Number.isNaN(current_value)) {
      report_initialization_error({
        function_name: 'set_reasoning_effort',
        log_message: 'Current reasoning effort value not found'
      })
      return
    }

    slider_control.focus()

    const difference = target_value - current_value
    const key = difference > 0 ? 'ArrowRight' : 'ArrowLeft'

    for (let i = 0; i < Math.abs(difference); i++) {
      slider_control.dispatchEvent(
        new KeyboardEvent('keydown', {
          key,
          bubbles: true,
          cancelable: true
        })
      )

      await new Promise((resolve) => requestAnimationFrame(resolve))
    }

    slider_control.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true
      })
    )

    await new Promise((resolve) => requestAnimationFrame(resolve))
  },
  set_options: async (chat) => {
    const options = chat.options
    if (!options) return
    const supported_options = CHATBOTS['ChatGPT'].supported_options
    for (const option of options) {
      if (option == 'temporary' && supported_options?.['temporary']) {
        const button = document.querySelector(
          '[data-testid="app-shell-header-context-menu-surface"] > div:last-child > div:last-child button'
        )
        let found = false
        if (button) {
          ;(button as HTMLElement).click()
          found = true
        }
        if (found) {
          await new Promise((resolve) => {
            const check_for_param = () => {
              if (window.location.search.includes('temporary-chat=true')) {
                setTimeout(() => resolve(null), 250)
              } else {
                setTimeout(check_for_param, 100)
              }
            }
            check_for_param()
          })
        } else {
          report_initialization_error({
            function_name: 'set_options',
            log_message: 'Temporary chat button not found'
            // Don't show alert because temporary mode doesn't work in projects (url override)
          })
        }
      }
    }
  },
  enter_message: async (params) => {
    const input_element = document.querySelector(
      'div[contenteditable="true"]'
    ) as HTMLTextAreaElement
    if (!input_element) {
      report_initialization_error({
        function_name: 'enter_message',
        log_message: 'Message input textarea not found for ChatGPT'
      })
      return
    }
    input_element.innerText = params.message
    input_element.dispatchEvent(new Event('input', { bubbles: true }))
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
              function_name: 'chatgpt.perform_copy',
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
      chatbot_name: 'ChatGPT',
      is_generating: () =>
        !!document.querySelector(
          'button path[d="M4.5 5.75C4.5 5.05964 5.05964 4.5 5.75 4.5H14.25C14.9404 4.5 15.5 5.05964 15.5 5.75V14.25C15.5 14.9404 14.9404 15.5 14.25 15.5H5.75C5.05964 15.5 4.5 14.9404 4.5 14.25V5.75Z"]'
        ),
      footer_selector:
        'div[data-talvt-turn-state="complete"] > div:last-child > div',
      add_buttons: params.inject_button ? add_buttons : undefined
    })
  }
}
