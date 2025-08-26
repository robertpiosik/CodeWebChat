import { Chatbot } from '../types/chatbot'
import { Message } from '@/types/messages'
import { CHATBOTS } from '@shared/constants/chatbots'
import browser from 'webextension-polyfill'
import {
  apply_chat_response_button_style,
  set_button_disabled_state
} from '../utils/apply-response-styles'
import { is_eligible_code_block } from '../utils/is-eligible-code-block'
import { show_response_ready_notification } from '../utils/show-response-ready-notification'
import {
  apply_response_button_text,
  apply_response_button_title
} from '../constants/copy'

export const ai_studio: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
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
    await open_panel()
  },
  set_model: async (model?: string) => {
    if (!model) return
    const model_selector = document.querySelector(
      'button.model-selector-card'
    ) as HTMLButtonElement
    const model_name = model_selector.querySelector(
      'span.title'
    ) as HTMLSpanElement
    if (
      model_name.textContent ==
      (CHATBOTS['AI Studio'].models as any)[model]?.label
    ) {
      return
    }
    model_selector.click()
    await new Promise((r) => requestAnimationFrame(r))
    // Click "All" filter option
    ;(
      document.querySelector(
        'div.model-categories-container button'
      ) as HTMLButtonElement
    )?.click()
    await new Promise((r) => requestAnimationFrame(r))
    const model_options = Array.from(
      document.querySelectorAll('ms-model-carousel-row button.content-button')
    )
    for (const option of model_options) {
      const model_name_element = option.querySelector(
        'span.model-title-text'
      ) as HTMLElement
      if (
        model_name_element?.textContent?.trim() ==
        (CHATBOTS['AI Studio'].models as any)[model]?.label
      ) {
        ;(option as HTMLElement).click()
        break
      }
    }
    await new Promise((r) => requestAnimationFrame(r))
  },
  enter_system_instructions: async (system_instructions?: string) => {
    if (!system_instructions) return
    const assignment_button = Array.from(
      document.querySelectorAll('ms-toolbar button')
    ).find(
      (button) => button.textContent?.trim() == 'assignment'
    ) as HTMLButtonElement
    assignment_button.click()
    await new Promise((r) => requestAnimationFrame(r))
    const system_instructions_selector =
      'textarea[aria-label="System instructions"]'
    const system_instructions_element = document.querySelector(
      system_instructions_selector
    ) as HTMLTextAreaElement
    system_instructions_element.value = system_instructions
    system_instructions_element.dispatchEvent(
      new Event('input', { bubbles: true })
    )
    system_instructions_element.dispatchEvent(
      new Event('change', { bubbles: true })
    )
    assignment_button.click()
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

    if (
      options.includes('disable-thinking') &&
      supported_options['disable-thinking']
    ) {
      if (thinking_toggle.getAttribute('aria-checked') == 'true') {
        thinking_toggle.click()
      }
    } else {
      if (thinking_toggle.getAttribute('aria-checked') == 'false') {
        thinking_toggle.click()
      }
    }

    if (options.includes('hide-panel') && supported_options['hide-panel']) {
      sessionStorage.setItem('should-hide-panel', 'true')
    }

    if (
      options.includes('temporary-chat') &&
      supported_options['temporary-chat']
    ) {
      const temp_toggle = document.querySelector(
        'ms-incognito-mode-toggle > button'
      ) as HTMLElement
      temp_toggle.click()
    }

    if (supported_options['grounding-with-google-search']) {
      const grounding_button = document.querySelector(
        'div[data-test-id="searchAsAToolTooltip"] button'
      ) as HTMLElement
      const is_checked = grounding_button.getAttribute('aria-checked') == 'true'
      const should_be_checked = options.includes('grounding-with-google-search')
      if (is_checked != should_be_checked) {
        grounding_button.click()
      }
    }

    if (options.includes('url-context') && supported_options['url-context']) {
      const url_context_button = document.querySelector(
        'div[data-test-id="browseAsAToolTooltip"] button'
      ) as HTMLElement
      url_context_button.click()
    }
    await new Promise((r) => requestAnimationFrame(r))
  },
  set_temperature: async (temperature?: number) => {
    if (temperature === undefined) return
    const temperature_element = document.querySelector(
      'ms-prompt-run-settings div[data-test-id="temperatureSliderContainer"] input[type=number]'
    ) as HTMLInputElement
    console.log(temperature_element)
    temperature_element.value = temperature.toString()
    temperature_element.dispatchEvent(new Event('change', { bubbles: true }))
  },
  set_thinking_budget: async (thinking_budget?: number) => {
    if (thinking_budget === undefined) {
      // uncheck "set thinking budget" when it has attribute aria-checked="true"
      const manual_budget_toggle = document.querySelector(
        'mat-slide-toggle[data-test-toggle="manual-budget"] button'
      ) as HTMLElement
      if (manual_budget_toggle?.getAttribute('aria-checked') == 'true') {
        manual_budget_toggle.click()
        await new Promise((r) => requestAnimationFrame(r))
      } else {
        console.warn('Manual budget toggle not found.')
      }
    } else {
      const thinking_toggle = document.querySelector(
        'mat-slide-toggle[data-test-toggle="enable-thinking"] button'
      ) as HTMLElement
      if (thinking_toggle.getAttribute('aria-checked') == 'false') {
        thinking_toggle.click()
        await new Promise((r) => requestAnimationFrame(r))
      }
      const manual_budget_toggle = document.querySelector(
        'mat-slide-toggle[data-test-toggle="manual-budget"] button'
      ) as HTMLElement
      if (manual_budget_toggle?.getAttribute('aria-checked') == 'false') {
        manual_budget_toggle.click()
        await new Promise((r) => requestAnimationFrame(r))
      }
      const budget_input = document.querySelector(
        'div[data-test-id="user-setting-budget-animation-wrapper"] input'
      ) as HTMLInputElement
      if (budget_input) {
        budget_input.value = thinking_budget.toString()
        budget_input.dispatchEvent(new Event('input', { bubbles: true }))
        budget_input.dispatchEvent(new Event('change', { bubbles: true }))
      } else {
        console.warn(
          'Budget input not found for setting thinking budget:',
          thinking_budget
        )
      }
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
    top_p_element.value = top_p.toString()
    top_p_element.dispatchEvent(new Event('change', { bubbles: true }))
  },
  enter_message_and_send: async (message: string) => {
    const input_element = document.querySelector(
      'textarea'
    ) as HTMLTextAreaElement
    input_element.value = message
    input_element.dispatchEvent(new Event('input', { bubbles: true }))
    input_element.dispatchEvent(new Event('change', { bubbles: true }))
    await new Promise((r) => requestAnimationFrame(r))
    await new Promise((resolve) => {
      const check = () => {
        const token_count_value = document.querySelector(
          'span.token-count-value'
        )
        const text = token_count_value?.textContent?.trim()
        if (text && text.startsWith('0')) {
          setTimeout(check, 100)
        } else {
          resolve(null)
        }
      }
      check()
    })
    await close_panel()
    ;(document.querySelector('ms-run-button > button') as HTMLElement)?.click()
  },
  inject_apply_response_button: (client_id: number) => {
    const add_buttons = (params: { footer: Element }) => {
      // Check if buttons already exist by text content to avoid duplicates
      const existing_apply_response_button = Array.from(
        params.footer.querySelectorAll('button')
      ).find((btn) => btn.textContent == apply_response_button_text)

      if (existing_apply_response_button) return

      // Find the parent chat-turn-container
      const chat_turn = params.footer.closest('ms-chat-turn') as HTMLElement

      if (!chat_turn) {
        console.error(
          'Chat turn container not found for footer:',
          params.footer
        )
        return
      }

      const first_line_comments_of_code_blocks =
        chat_turn.querySelectorAll('ms-code-block code')
      let has_eligible_block = false
      for (const code_block of Array.from(first_line_comments_of_code_blocks)) {
        const first_line_text = code_block?.textContent?.split('\n')[0]
        if (first_line_text && is_eligible_code_block(first_line_text)) {
          has_eligible_block = true
          break
        }
      }
      if (!has_eligible_block) return

      const create_apply_response_button = () => {
        const apply_response_button = document.createElement('button')
        apply_response_button.textContent = apply_response_button_text
        apply_response_button.title = apply_response_button_title
        apply_chat_response_button_style(apply_response_button)

        apply_response_button.addEventListener('click', async () => {
          set_button_disabled_state(apply_response_button)
          const chat_turn_container = apply_response_button.closest(
            '.chat-turn-container'
          )!
          const options = chat_turn_container.querySelector(
            'ms-chat-turn-options > div > button'
          ) as HTMLElement
          options.click()
          const markdown_copy_button = Array.from(
            document.querySelectorAll('button')
          ).find((button) =>
            button.textContent?.includes('markdown_copy')
          ) as HTMLElement
          markdown_copy_button.click()
          await new Promise((resolve) => setTimeout(resolve, 500))
          browser.runtime.sendMessage<Message>({
            action: 'apply-chat-response',
            client_id
          })
        })

        params.footer.insertBefore(
          apply_response_button,
          params.footer.children[2]
        )

        apply_response_button.focus()
      }

      create_apply_response_button()
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
            add_buttons({
              footer
            })
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
    const tune_button = document.querySelector(
      'button.runsettings-toggle-button'
    ) as HTMLButtonElement
    tune_button.click()
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
}

const close_panel = async () => {
  if (window.innerWidth <= 960) {
    const close_button = document.querySelector(
      'ms-run-settings button[iconname="close"]'
    ) as HTMLButtonElement
    close_button.click()
  } else {
    if (sessionStorage.getItem('should-hide-panel') == 'true') {
      const close_button = document.querySelector(
        'ms-run-settings button[iconname="close"]'
      ) as HTMLButtonElement
      close_button.click()
    }
  }
  await new Promise((r) => requestAnimationFrame(r))
}
