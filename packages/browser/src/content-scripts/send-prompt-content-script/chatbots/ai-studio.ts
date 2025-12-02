import { Chatbot } from '../types/chatbot'
import { CHATBOTS } from '@shared/constants/chatbots'
import { show_response_ready_notification } from '../utils/show-response-ready-notification'
import { add_apply_response_button } from '../utils/add-apply-response-button'
import { report_initialization_error } from '../utils/report-initialization-error'

export const ai_studio: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        if (!document.querySelector('ms-incognito-mode-toggle > button')) {
          setTimeout(check_for_element, 100)
          return
        }
        if (window.innerWidth <= 960) {
          if (document.querySelector('button.runsettings-toggle-button')) {
            resolve(null)
          } else {
            setTimeout(check_for_element, 100)
          }
        } else {
          if (document.querySelector('button.model-selector-card')) {
            resolve(null)
          } else {
            setTimeout(check_for_element, 100)
          }
        }
      }
      check_for_element()
    })
  },
  enter_system_instructions: async (system_instructions?: string) => {
    if (!system_instructions) return
    await open_panel()
    const system_instructions_button = document.querySelector(
      'button[data-test-system-instructions-card]'
    ) as HTMLButtonElement
    if (!system_instructions_button) {
      report_initialization_error({
        function_name: 'enter_system_instructions',
        log_message: 'System instructions button not found'
      })
      return
    }

    system_instructions_button.click()
    await new Promise((r) => requestAnimationFrame(r))

    const close_button = document.querySelector(
      'mat-dialog-container button[data-test-close-button]'
    ) as HTMLButtonElement
    if (!close_button) {
      report_initialization_error({
        function_name: 'enter_system_instructions',
        log_message: 'Close button for system instructions dialog not found'
      })
      return
    }

    const panel = document.querySelector(
      'ms-system-instructions'
    ) as HTMLDivElement
    if (!panel) {
      report_initialization_error({
        function_name: 'enter_system_instructions',
        log_message: 'System instructions panel not found'
      })
      return
    }

    const textarea = panel.querySelector('textarea') as HTMLTextAreaElement
    if (!textarea) {
      report_initialization_error({
        function_name: 'enter_system_instructions',
        log_message: 'System instructions textarea not found'
      })
      return
    }

    textarea.value = system_instructions
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
    textarea.dispatchEvent(new Event('change', { bubbles: true }))

    close_button.click()
    await new Promise((r) => requestAnimationFrame(r))
  },
  set_options: async (options?: string[]) => {
    if (!options) return
    const settings_items = Array.from(
      document.querySelectorAll('div.settings-item')
    )
    const tools = settings_items.find((item) => {
      const title_element = item.querySelector('p.group-title')
      return title_element && title_element.textContent?.trim() == 'Tools'
    })

    if (tools && !tools.classList.contains('expanded')) {
      ;(tools as HTMLElement).click()
      await new Promise((r) => requestAnimationFrame(r))
    }
    const supported_options = CHATBOTS['AI Studio'].supported_options
    const thinking_toggle = document.querySelector(
      'mat-slide-toggle[data-test-toggle="enable-thinking"] button'
    ) as HTMLElement
    if (!thinking_toggle) {
      report_initialization_error({
        function_name: 'set_options',
        log_message: 'Thinking toggle not found'
      })
    } else {
      if (
        options.includes('disable-thinking') &&
        supported_options?.['disable-thinking']
      ) {
        if (thinking_toggle.getAttribute('aria-checked') == 'true') {
          thinking_toggle.click()
        }
      } else {
        if (thinking_toggle?.getAttribute('aria-checked') == 'false') {
          thinking_toggle.click()
        }
      }
    }

    if (options.includes('hide-panel') && supported_options?.['hide-panel']) {
      sessionStorage.setItem('should-hide-panel', 'true')
    }

    if (
      options.includes('temporary-chat') &&
      supported_options?.['temporary-chat']
    ) {
      const temp_toggle = document.querySelector(
        'ms-incognito-mode-toggle > button'
      ) as HTMLElement
      if (!temp_toggle) {
        report_initialization_error({
          function_name: 'set_options',
          log_message: 'Temporary chat toggle not found'
        })
        return
      }
      if (!temp_toggle.classList.contains('ms-button-active')) {
        temp_toggle.click()
      }
    }

    if (supported_options?.['grounding-with-google-search']) {
      const grounding_button = document.querySelector(
        'div[data-test-id="searchAsAToolTooltip"] button'
      ) as HTMLElement
      if (!grounding_button) {
        report_initialization_error({
          function_name: 'set_options',
          log_message: 'Grounding with Google Search button not found'
        })
        return
      }
      const is_checked = grounding_button.getAttribute('aria-checked') == 'true'
      const should_be_checked = options.includes('grounding-with-google-search')
      if (is_checked != should_be_checked) {
        grounding_button.click()
      }
    }

    if (options.includes('url-context') && supported_options?.['url-context']) {
      const url_context_button = document.querySelector(
        'div[data-test-id="browseAsAToolTooltip"] button'
      ) as HTMLElement
      if (!url_context_button) {
        report_initialization_error({
          function_name: 'set_options',
          log_message: 'URL context button not found'
        })
        return
      }
      url_context_button.click()
    }
    await new Promise((r) => requestAnimationFrame(r))
  },
  set_temperature: async (temperature?: number) => {
    if (temperature === undefined) return
    const temperature_element = document.querySelector(
      'ms-prompt-run-settings div[data-test-id="temperatureSliderContainer"] input[type=number]'
    ) as HTMLInputElement
    if (!temperature_element) {
      report_initialization_error({
        function_name: 'set_temperature',
        log_message: 'Temperature input not found'
      })
      return
    }
    temperature_element.value = temperature.toString()
    temperature_element.dispatchEvent(new Event('change', { bubbles: true }))
  },
  set_reasoning_effort: async (reasoning_effort?: string) => {
    if (!reasoning_effort) return

    await open_panel()

    const thinking_level_setting = document.querySelector(
      'ms-thinking-level-setting mat-form-field > div'
    ) as HTMLElement

    if (!thinking_level_setting) {
      report_initialization_error({
        function_name: 'set_reasoning_effort',
        log_message: 'Thinking level setting element not found'
      })
      return
    }

    thinking_level_setting.click()
    await new Promise((r) => requestAnimationFrame(r))

    const options_container = document.querySelector('div[role="listbox"]')
    if (!options_container) {
      report_initialization_error({
        function_name: 'set_reasoning_effort',
        log_message: 'Reasoning effort options container not found'
      })
      return
    }

    const target_label =
      reasoning_effort.charAt(0).toUpperCase() + reasoning_effort.slice(1)

    const options = Array.from(
      options_container.querySelectorAll('mat-option')
    ) as HTMLElement[]

    for (const option of options) {
      const label = option.textContent?.trim()
      if (label == target_label) {
        option.click()
        break
      }
    }

    await new Promise((r) => requestAnimationFrame(r))
  },
  set_thinking_budget: async (thinking_budget?: number) => {
    if (thinking_budget === undefined) {
      const thinking_toggle = document.querySelector(
        'mat-slide-toggle[data-test-toggle="enable-thinking"] button'
      ) as HTMLElement
      if (thinking_toggle?.getAttribute('aria-checked') == 'false') {
        return
      }

      const manual_budget_toggle = document.querySelector(
        'mat-slide-toggle[data-test-toggle="manual-budget"] button'
      ) as HTMLElement
      if (!manual_budget_toggle) {
        report_initialization_error({
          function_name: 'set_thinking_budget',
          log_message: 'Manual budget toggle not found'
        })
        return
      }
      if (manual_budget_toggle.getAttribute('aria-checked') == 'true') {
        manual_budget_toggle.click()
        await new Promise((r) => requestAnimationFrame(r))
      }
    } else {
      const thinking_toggle = document.querySelector(
        'mat-slide-toggle[data-test-toggle="enable-thinking"] button'
      ) as HTMLElement
      if (!thinking_toggle) {
        report_initialization_error({
          function_name: 'set_thinking_budget',
          log_message: 'Thinking toggle not found'
        })
        return
      }
      if (thinking_toggle.getAttribute('aria-checked') == 'false') {
        thinking_toggle.click()
        await new Promise((resolve) => setTimeout(resolve, 250))
      }
      const manual_budget_toggle = document.querySelector(
        'mat-slide-toggle[data-test-toggle="manual-budget"] button'
      ) as HTMLElement
      if (!manual_budget_toggle) {
        report_initialization_error({
          function_name: 'set_thinking_budget',
          log_message: 'Manual budget toggle not found'
        })
        return
      }
      if (manual_budget_toggle.getAttribute('aria-checked') == 'false') {
        manual_budget_toggle.click()
        await new Promise((resolve) => setTimeout(resolve, 250))
      }
      const budget_input = document.querySelector(
        'div[data-test-id="user-setting-budget-animation-wrapper"] input'
      ) as HTMLInputElement
      if (!budget_input) {
        report_initialization_error({
          function_name: 'set_thinking_budget',
          log_message: 'Budget input not found'
        })
        return
      }
      budget_input.value = thinking_budget.toString()
      budget_input.dispatchEvent(new Event('input', { bubbles: true }))
      budget_input.dispatchEvent(new Event('change', { bubbles: true }))
    }
  },
  set_top_p: async (top_p?: number) => {
    if (top_p === undefined) return
    const settings_items = Array.from(
      document.querySelectorAll('div.settings-item')
    )
    const advanced_settings = settings_items.find((item) => {
      const title_element = item.querySelector('p.group-title')
      return (
        title_element &&
        title_element.textContent?.trim() == 'Advanced settings'
      )
    })
    if (
      advanced_settings &&
      !advanced_settings.classList.contains('expanded')
    ) {
      ;(advanced_settings as HTMLElement).click()
      await new Promise((r) => requestAnimationFrame(r))
    }
    const top_p_element = document.querySelector(
      'ms-prompt-run-settings div[mattooltip="Probability threshold for top-p sampling"] input[type=number]'
    ) as HTMLInputElement
    if (!top_p_element) {
      report_initialization_error({
        function_name: 'set_top_p',
        log_message: 'Top-p input not found'
      })
      return
    }
    top_p_element.value = top_p.toString()
    top_p_element.dispatchEvent(new Event('change', { bubbles: true }))
  },
  enter_message_and_send: async (params) => {
    const input_element = document.querySelector(
      'textarea'
    ) as HTMLTextAreaElement
    if (!input_element) {
      report_initialization_error({
        function_name: 'enter_message_and_send',
        log_message: 'Message input textarea not found'
      })
      return
    }
    input_element.value = params.message
    input_element.dispatchEvent(new Event('input', { bubbles: true }))
    input_element.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise((r) => requestAnimationFrame(r))
    await new Promise((resolve) => {
      const check = () => {
        const token_count_value = document.querySelector(
          'span.v3-token-count-value'
        )
        const text = token_count_value?.textContent?.trim()
        if (!text || (text && text.startsWith('0'))) {
          setTimeout(check, 100)
        } else {
          resolve(null)
        }
      }
      check()
    })

    await close_panel()

    if (params.without_submission) return

    const send_button = document.querySelector(
      'ms-run-button > button'
    ) as HTMLElement
    if (!send_button) {
      report_initialization_error({
        function_name: 'enter_message_and_send',
        log_message: 'Send button not found'
      })
      return
    }
    send_button.click()
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
        get_chat_turn: (f) => f.closest('ms-chat-turn'),
        perform_copy: (f) => {
          const chat_turn_container = f.closest('.chat-turn-container')
          if (!chat_turn_container) {
            report_initialization_error({
              function_name: 'ai_studio.perform_copy',
              log_message: 'Chat turn container not found'
            })
            return
          }
          const options = chat_turn_container.querySelector(
            'ms-chat-turn-options > div > button'
          ) as HTMLElement
          if (!options) {
            report_initialization_error({
              function_name: 'ai_studio.perform_copy',
              log_message: 'Options button not found'
            })
            return
          }
          options.click()
          const markdown_copy_button = Array.from(
            document.querySelectorAll('button')
          ).find((button) =>
            button.textContent?.includes('markdown_copy')
          ) as HTMLElement
          if (!markdown_copy_button) {
            report_initialization_error({
              function_name: 'ai_studio.perform_copy',
              log_message: 'Markdown copy button not found'
            })
            return
          }
          markdown_copy_button.click()
        },
        insert_button: (f, b) => f.insertBefore(b, f.children[2])
      })
    }

    // AI Studio is quite sluggish with showing already generated tokens,
    // therefore we handle waiting for finished response differently than
    // in other chatbots.
    let debounce_timer: NodeJS.Timeout
    const observer = new MutationObserver(() => {
      clearTimeout(debounce_timer)
      debounce_timer = setTimeout(() => {
        const all_footers = document.querySelectorAll(
          'ms-chat-turn .turn-footer'
        )
        all_footers.forEach((footer) => {
          if (footer.querySelector('button[iconname="thumb_up"]')) {
            show_response_ready_notification({ chatbot_name: 'AI Studio' })
            add_buttons(footer)
          }
        })
      }, 100)
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    })
  }
}

const open_panel = async () => {
  if (window.innerWidth <= 960) {
    if (document.querySelector('ms-right-side-panel > div')) return // Already opened

    const tune_button = document.querySelector(
      'button.runsettings-toggle-button'
    ) as HTMLButtonElement
    if (!tune_button) {
      report_initialization_error({
        function_name: 'open_panel',
        log_message: 'Tune button not found'
      })
      return
    }
    tune_button.click()
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
}

const close_panel = async () => {
  if (window.innerWidth <= 960) {
    if (!document.querySelector('ms-right-side-panel > div')) return // Already closed
    const close_button = document.querySelector(
      'ms-run-settings button[iconname="close"]'
    ) as HTMLButtonElement
    if (!close_button) {
      report_initialization_error({
        function_name: 'close_panel',
        log_message: 'Close button for settings panel not found'
      })
      return
    }
    close_button.click()
  } else {
    if (sessionStorage.getItem('should-hide-panel') == 'true') {
      const close_button = document.querySelector(
        'ms-run-settings button[iconname="close"]'
      ) as HTMLButtonElement
      if (!close_button) {
        report_initialization_error({
          function_name: 'close_panel',
          log_message: 'Close button for settings panel not found'
        })
        return
      }
      close_button.click()
    }
  }
  await new Promise((r) => requestAnimationFrame(r))
}
