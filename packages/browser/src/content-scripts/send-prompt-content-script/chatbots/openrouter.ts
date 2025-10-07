import { Chatbot } from '../types/chatbot'
import {
  add_apply_response_button,
  observe_for_responses
} from '../utils/add-apply-response-button'
import {
  InitializationError,
  report_initialization_error
} from '../utils/report-initialization-error'

const show_options_modal = async (
  function_name: string,
  alert_message: InitializationError
) => {
  const options_button = Array.from(
    document.querySelectorAll('main > div > div > div.flex-col button')
  ).find((button) => {
    const path = button.querySelector('path')
    return (
      path?.getAttribute('d') ==
      'M12 6.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 12.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5ZM12 18.75a.75.75 0 1 1 0-1.5.75.75 0 0 1 0 1.5Z'
    )
  }) as HTMLButtonElement
  if (!options_button) {
    report_initialization_error({
      function_name,
      log_message: 'Options button not found',
      alert_message
    })
    return false
  }
  options_button.click()
  await new Promise((r) => requestAnimationFrame(r))
  return true
}

const close_options_modal = async (
  function_name: string,
  alert_message: InitializationError
) => {
  const close_button = document.querySelector(
    'div[role="dialog"] button[data-slot="dialog-close"]'
  ) as HTMLButtonElement
  if (!close_button) {
    report_initialization_error({
      function_name,
      log_message: 'Close button for dialog not found',
      alert_message
    })
    return false
  }
  close_button.click()
  await new Promise((r) => requestAnimationFrame(r))
  return true
}

export const openrouter: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        if (document.querySelector('textarea')) {
          resolve(null)
        } else {
          setTimeout(check_for_element, 100)
        }
      }
      check_for_element()
    })
    await new Promise((resolve) => setTimeout(resolve, 500))
  },
  enter_system_instructions: async (system_instructions?: string) => {
    if (!system_instructions) return
    if (
      !(await show_options_modal(
        'enter_system_instructions',
        InitializationError.UNABLE_TO_SET_SYSTEM_INSTRUCTIONS
      ))
    )
      return
    const textarea = document.querySelector(
      'div[role="dialog"] textarea'
    ) as HTMLTextAreaElement
    if (!textarea) {
      report_initialization_error({
        function_name: 'enter_system_instructions',
        log_message: 'System instructions textarea not found',
        alert_message: InitializationError.UNABLE_TO_SET_SYSTEM_INSTRUCTIONS
      })
      await close_options_modal(
        'enter_system_instructions',
        InitializationError.UNABLE_TO_SET_SYSTEM_INSTRUCTIONS
      )
      return
    }
    const custom_system_instructions_button =
      textarea.parentElement?.parentElement?.querySelector(
        'div > button:last-child'
      )
    if (!custom_system_instructions_button) {
      report_initialization_error({
        function_name: 'enter_system_instructions',
        log_message: 'Custom system instructions button not found',
        alert_message: InitializationError.UNABLE_TO_SET_SYSTEM_INSTRUCTIONS
      })
      await close_options_modal(
        'enter_system_instructions',
        InitializationError.UNABLE_TO_SET_SYSTEM_INSTRUCTIONS
      )
      return
    }
    ;(custom_system_instructions_button as HTMLElement)?.click()
    await new Promise((r) => requestAnimationFrame(r))
    textarea.focus()
    textarea.value = system_instructions
    textarea.dispatchEvent(new Event('change', { bubbles: true }))
    textarea.blur()
    await close_options_modal(
      'enter_system_instructions',
      InitializationError.UNABLE_TO_SET_SYSTEM_INSTRUCTIONS
    )
  },
  set_options: async (options?: string[]) => {
    if (!options) return
    if (
      !(await show_options_modal(
        'set_options',
        InitializationError.UNABLE_TO_SET_OPTIONS
      ))
    )
      return
    const reasoning_toggle = document.querySelector(
      'button[id^="toggle-reasoning-char-"]'
    ) as HTMLButtonElement

    // Only some models support this option
    if (reasoning_toggle) {
      if (options.includes('disable-reasoning')) {
        if (reasoning_toggle.getAttribute('data-state') == 'checked') {
          reasoning_toggle.click()
        }
      }
    }

    await close_options_modal(
      'set_options',
      InitializationError.UNABLE_TO_SET_OPTIONS
    )
  },
  set_temperature: async (temperature?: number) => {
    if (temperature === undefined) return
    if (
      !(await show_options_modal(
        'set_temperature',
        InitializationError.UNABLE_TO_SET_TEMPERATURE
      ))
    )
      return
    const sampling_parameters_button = Array.from(
      document.querySelectorAll('div[role="dialog"] button')
    ).find(
      (button) => button.textContent?.trim() == 'Sampling Parameters'
    ) as HTMLButtonElement
    if (!sampling_parameters_button) {
      report_initialization_error({
        function_name: 'set_temperature',
        log_message: 'Sampling parameters button not found',
        alert_message: InitializationError.UNABLE_TO_SET_TEMPERATURE
      })
      await close_options_modal(
        'set_temperature',
        InitializationError.UNABLE_TO_SET_TEMPERATURE
      )
      return
    }
    sampling_parameters_button.click()
    await new Promise((r) => requestAnimationFrame(r))
    const temperature_div = Array.from(
      document.querySelectorAll(
        'div[role="dialog"] div.flex.justify-between.text-sm'
      )
    ).find((div) => div.textContent?.trim() == 'Temperature') as HTMLElement
    if (!temperature_div) {
      report_initialization_error({
        function_name: 'set_temperature',
        log_message: 'Temperature div not found',
        alert_message: InitializationError.UNABLE_TO_SET_TEMPERATURE
      })
      await close_options_modal(
        'set_temperature',
        InitializationError.UNABLE_TO_SET_TEMPERATURE
      )
      return
    }
    const temperature_input = temperature_div.querySelector(
      'input'
    ) as HTMLInputElement
    if (!temperature_input) {
      report_initialization_error({
        function_name: 'set_temperature',
        log_message: 'Temperature input not found',
        alert_message: InitializationError.UNABLE_TO_SET_TEMPERATURE
      })
      await close_options_modal(
        'set_temperature',
        InitializationError.UNABLE_TO_SET_TEMPERATURE
      )
      return
    }
    temperature_input.focus()
    temperature_input.value = temperature.toString()
    temperature_input.dispatchEvent(new Event('change', { bubbles: true }))
    temperature_input.blur()
    await close_options_modal(
      'set_temperature',
      InitializationError.UNABLE_TO_SET_TEMPERATURE
    )
  },
  set_top_p: async (top_p?: number) => {
    if (top_p === undefined) return
    if (
      !(await show_options_modal(
        'set_top_p',
        InitializationError.UNABLE_TO_SET_TOP_P
      ))
    )
      return
    const sampling_parameters_button = Array.from(
      document.querySelectorAll('div[role="dialog"] button')
    ).find(
      (button) => button.textContent?.trim() == 'Sampling Parameters'
    ) as HTMLButtonElement
    if (!sampling_parameters_button) {
      report_initialization_error({
        function_name: 'set_top_p',
        log_message: 'Sampling parameters button not found',
        alert_message: InitializationError.UNABLE_TO_SET_TOP_P
      })
      await close_options_modal(
        'set_top_p',
        InitializationError.UNABLE_TO_SET_TOP_P
      )
      return
    }
    sampling_parameters_button.click()
    await new Promise((r) => requestAnimationFrame(r))
    const top_p_div = Array.from(
      document.querySelectorAll(
        'div[role="dialog"] div.flex.justify-between.text-sm'
      )
    ).find((div) => div.textContent?.trim() == 'Top P') as HTMLElement
    if (!top_p_div) {
      report_initialization_error({
        function_name: 'set_top_p',
        log_message: 'Top P div not found',
        alert_message: InitializationError.UNABLE_TO_SET_TOP_P
      })
      await close_options_modal(
        'set_top_p',
        InitializationError.UNABLE_TO_SET_TOP_P
      )
      return
    }
    const top_p_input = top_p_div.querySelector('input') as HTMLInputElement
    if (!top_p_input) {
      report_initialization_error({
        function_name: 'set_top_p',
        log_message: 'Top P input not found',
        alert_message: InitializationError.UNABLE_TO_SET_TOP_P
      })
      await close_options_modal(
        'set_top_p',
        InitializationError.UNABLE_TO_SET_TOP_P
      )
      return
    }
    top_p_input.focus()
    top_p_input.value = top_p.toString()
    top_p_input.dispatchEvent(new Event('change', { bubbles: true }))
    top_p_input.blur()
    await close_options_modal(
      'set_top_p',
      InitializationError.UNABLE_TO_SET_TOP_P
    )
  },
  set_reasoning_effort: async (reasoning_effort?: string) => {
    if (!reasoning_effort) return
    if (
      !(await show_options_modal(
        'set_reasoning_effort',
        InitializationError.UNABLE_TO_SET_REASONING_EFFORT
      ))
    )
      return
    const dialog = document.querySelector('div[role="dialog"]')
    if (!dialog) {
      report_initialization_error({
        function_name: 'set_reasoning_effort',
        log_message: 'Dialog not found',
        alert_message: InitializationError.UNABLE_TO_SET_REASONING_EFFORT
      })
      return
    }

    const reasoning_button = Array.from(dialog.querySelectorAll('button')).find(
      (button) =>
        ['Minimal', 'Low', 'Medium', 'High'].includes(
          button.textContent?.trim() || ''
        )
    ) as HTMLButtonElement

    if (!reasoning_button) {
      await close_options_modal(
        'set_reasoning_effort',
        InitializationError.UNABLE_TO_SET_REASONING_EFFORT
      )
      return
    }

    if (reasoning_button.textContent != reasoning_effort) {
      reasoning_button.click()
      await new Promise((resolve) => setTimeout(resolve, 500)) // Opening animation must finish
      const dropdown = document.querySelector(
        'div[data-radix-popper-content-wrapper]'
      )
      if (!dropdown) {
        report_initialization_error({
          function_name: 'set_reasoning_effort',
          log_message: 'Reasoning effort dropdown not found',
          alert_message: InitializationError.UNABLE_TO_SET_REASONING_EFFORT
        })
        await close_options_modal(
          'set_reasoning_effort',
          InitializationError.UNABLE_TO_SET_REASONING_EFFORT
        )
        return
      }

      const options = dropdown.querySelectorAll('div[role="option"]')
      let found = false
      for (const option of Array.from(options)) {
        if (option.textContent == reasoning_effort) {
          ;(option as HTMLElement).click()
          found = true
          break
        }
      }

      if (!found) {
        report_initialization_error({
          function_name: 'set_reasoning_effort',
          log_message: `Reasoning effort option "${reasoning_effort}" not found`,
          alert_message: InitializationError.UNABLE_TO_SET_REASONING_EFFORT
        })
      }
    }

    await close_options_modal(
      'set_reasoning_effort',
      InitializationError.UNABLE_TO_SET_REASONING_EFFORT
    )
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
        get_chat_turn: (f) => f.closest('div[data-message-id]'),
        get_code_blocks: (t) => t.querySelectorAll('code'),
        perform_copy: (f) => {
          const actions = f.querySelectorAll('button')
          const copy_button = Array.from(actions).find((button) => {
            const path = button.querySelector('path')
            return (
              path?.getAttribute('d') ==
              'M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184'
            )
          }) as HTMLButtonElement
          if (!copy_button) {
            report_initialization_error({
              function_name: 'openrouter.perform_copy',
              log_message: 'Copy button not found',
              alert_message: InitializationError.UNABLE_TO_COPY_RESPONSE
            })
            return
          }
          copy_button.click()
        },
        insert_button: (f, b) => f.insertBefore(b, f.children[5])
      })
    }

    observe_for_responses({
      chatbot_name: 'OpenRouter',
      is_generating: () =>
        !!document.querySelector(
          'path[d="M4.5 7.5a3 3 0 0 1 3-3h9a3 3 0 0 1 3 3v9a3 3 0 0 1-3-3h-9a3 3 0 0 1-3-3v-9Z"]'
        ),
      footer_selector: 'div[data-message-id] > div > div:last-child > div',
      add_buttons
    })
  }
}
