import { Chatbot } from '../types/chatbot'
import {
  add_apply_response_button,
  observe_for_responses
} from '../utils/add-apply-response-button'
import { report_initialization_error } from '../utils/report-initialization-error'

export const open_webui: Chatbot = {
  wait_until_ready: async () => {
    await new Promise((resolve) => {
      const check_for_element = () => {
        if (
          document.querySelector('#messages-container') &&
          document.visibilityState == 'visible'
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
  enter_system_instructions: async (system_instructions?: string) => {
    if (!system_instructions) return
    const controls_button = document.querySelector(
      'button[aria-label="Controls"]'
    ) as HTMLButtonElement
    if (!controls_button) {
      report_initialization_error({
        function_name: 'enter_system_instructions',
        log_message: 'Controls button not found',
        alert_message: 'Unable to set system instructions'
      })
      return
    }
    controls_button.click()
    await new Promise((r) => requestAnimationFrame(r))
    const controls_pane =
      window.innerWidth >= 1024
        ? (document.querySelector('[data-pane]:last-child') as HTMLElement)
        : (document.querySelector('div.modal') as HTMLElement)
    if (!controls_pane) {
      report_initialization_error({
        function_name: 'enter_system_instructions',
        log_message: 'Controls pane not found',
        alert_message: 'Unable to set system instructions'
      })
      return
    }
    const system_instructions_textarea = controls_pane.querySelector(
      'textarea'
    ) as HTMLTextAreaElement
    if (!system_instructions_textarea) {
      report_initialization_error({
        function_name: 'enter_system_instructions',
        log_message: 'System instructions textarea not found',
        alert_message: 'Unable to set system instructions'
      })
      return
    }
    system_instructions_textarea.value = system_instructions
    system_instructions_textarea.dispatchEvent(
      new Event('input', { bubbles: true })
    )
    system_instructions_textarea.dispatchEvent(
      new Event('change', { bubbles: true })
    )
    const close_button = controls_pane.querySelector(
      'button'
    ) as HTMLButtonElement
    if (!close_button) {
      report_initialization_error({
        function_name: 'enter_system_instructions',
        log_message: 'Close button for controls pane not found',
        alert_message: 'Unable to set system instructions'
      })
      return
    }
    close_button.click()
  },
  set_temperature: async (temperature?: number) => {
    if (temperature === undefined) return
    const controls_button = document.querySelector(
      'button[aria-label="Controls"]'
    ) as HTMLButtonElement
    if (!controls_button) {
      report_initialization_error({
        function_name: 'set_temperature',
        log_message: 'Controls button not found',
        alert_message: 'Unable to set temperature'
      })
      return
    }
    controls_button.click()
    await new Promise((r) => requestAnimationFrame(r))
    const controls_pane =
      window.innerWidth >= 1024
        ? (document.querySelector('[data-pane]:last-child') as HTMLElement)
        : (document.querySelector('div.modal') as HTMLElement)
    if (!controls_pane) {
      report_initialization_error({
        function_name: 'set_temperature',
        log_message: 'Controls pane not found',
        alert_message: 'Unable to set temperature'
      })
      return
    }
    const pb_safe_bottom = controls_pane.querySelector(
      '.pb-safe-bottom'
    ) as HTMLElement
    if (!pb_safe_bottom) {
      report_initialization_error({
        function_name: 'set_temperature',
        log_message: 'pb_safe_bottom element not found in controls pane',
        alert_message: 'Unable to set temperature'
      })
      return
    }
    const temperature_div = pb_safe_bottom.querySelector(
      'div:nth-child(5)'
    ) as HTMLElement
    if (!temperature_div) {
      report_initialization_error({
        function_name: 'set_temperature',
        log_message: 'Temperature container not found',
        alert_message: 'Unable to set temperature'
      })
      return
    }
    const button = temperature_div.querySelector('button') as HTMLElement
    if (!button) {
      report_initialization_error({
        function_name: 'set_temperature',
        log_message: 'Temperature reset button not found',
        alert_message: 'Unable to set temperature'
      })
      return
    }
    button.click()
    await new Promise((r) => requestAnimationFrame(r))
    const input = temperature_div.querySelector('input') as HTMLInputElement
    if (!input) {
      report_initialization_error({
        function_name: 'set_temperature',
        log_message: 'Temperature input not found',
        alert_message: 'Unable to set temperature'
      })
      return
    }
    input.value = temperature.toString()
    input.dispatchEvent(new Event('change', { bubbles: true }))
    const close_button = controls_pane.querySelector(
      'button'
    ) as HTMLButtonElement
    if (!close_button) {
      report_initialization_error({
        function_name: 'set_temperature',
        log_message: 'Close button for controls pane not found',
        alert_message: 'Unable to set temperature'
      })
      return
    }
    close_button.click()
    await new Promise((r) => requestAnimationFrame(r))
  },
  set_top_p: async (top_p?: number) => {
    if (top_p === undefined) return
    const controls_button = document.querySelector(
      'button[aria-label="Controls"]'
    ) as HTMLButtonElement
    if (!controls_button) {
      report_initialization_error({
        function_name: 'set_top_p',
        log_message: 'Controls button not found',
        alert_message: 'Unable to set top-p'
      })
      return
    }
    controls_button.click()
    await new Promise((r) => requestAnimationFrame(r))
    const controls_pane =
      window.innerWidth >= 1024
        ? (document.querySelector('[data-pane]:last-child') as HTMLElement)
        : (document.querySelector('div.modal') as HTMLElement)
    if (!controls_pane) {
      report_initialization_error({
        function_name: 'set_top_p',
        log_message: 'Controls pane not found',
        alert_message: 'Unable to set top-p'
      })
      return
    }
    const pb_safe_bottom = controls_pane.querySelector(
      '.pb-safe-bottom'
    ) as HTMLElement
    if (!pb_safe_bottom) {
      report_initialization_error({
        function_name: 'set_top_p',
        log_message: 'pb_safe_bottom element not found in controls pane',
        alert_message: 'Unable to set top-p'
      })
      return
    }
    const top_p_div = pb_safe_bottom.querySelector(
      'div:nth-child(12)'
    ) as HTMLElement
    if (!top_p_div) {
      report_initialization_error({
        function_name: 'set_top_p',
        log_message: 'Top-p container not found',
        alert_message: 'Unable to set top-p'
      })
      return
    }
    const button = top_p_div.querySelector('button') as HTMLElement
    if (!button) {
      report_initialization_error({
        function_name: 'set_top_p',
        log_message: 'Top-p reset button not found',
        alert_message: 'Unable to set top-p'
      })
      return
    }
    button.click()
    await new Promise((r) => requestAnimationFrame(r))
    const input = top_p_div.querySelector('input') as HTMLInputElement
    if (!input) {
      report_initialization_error({
        function_name: 'set_top_p',
        log_message: 'Top-p input not found',
        alert_message: 'Unable to set top-p'
      })
      return
    }
    input.value = top_p.toString()
    input.dispatchEvent(new Event('change', { bubbles: true }))
    const close_button = controls_pane.querySelector(
      'button'
    ) as HTMLButtonElement
    if (!close_button) {
      report_initialization_error({
        function_name: 'set_top_p',
        log_message: 'Close button for controls pane not found',
        alert_message: 'Unable to set top-p'
      })
      return
    }
    close_button.click()
    await new Promise((r) => requestAnimationFrame(r))
  },
  set_model: async (model?: string) => {
    if (!model) return
    const model_selector_button = document.querySelector(
      'button#model-selector-0-button'
    ) as HTMLElement
    if (!model_selector_button) {
      report_initialization_error({
        function_name: 'set_model',
        log_message: 'Model selector button not found',
        alert_message: 'Unable to set model'
      })
      return
    }
    model_selector_button.click()
    await new Promise((r) => requestAnimationFrame(r))
    const model_selector_menu = document.querySelector(
      'div[aria-labelledby="model-selector-0-button"]'
    ) as HTMLElement
    if (!model_selector_menu) {
      report_initialization_error({
        function_name: 'set_model',
        log_message: 'Model selector menu not found',
        alert_message: 'Unable to set model'
      })
      return
    }
    const model_button = model_selector_menu.querySelector(
      `button[data-value="${model}"]`
    ) as HTMLElement
    if (model_button) {
      model_button.click()
    } else {
      Logger.error({
        function_name: 'set_model',
        message: `Model button for "${model}" not found`
      })
      alert(`Unable to set model "${model}". It might not be available.`)
      model_selector_button.click()
    }
    await new Promise((r) => requestAnimationFrame(r))
  },
  inject_apply_response_button: (client_id: number) => {
    const add_buttons = (footer: Element) => {
      add_apply_response_button({
        client_id,
        footer,
        get_chat_turn: (f) =>
          f.parentElement?.querySelector(
            '#response-content-container'
          ) as HTMLElement,
        get_code_blocks: (t) => t.querySelectorAll('.cm-content'),
        get_code_from_block: (b) => b.querySelector('.cm-line')?.textContent,
        perform_copy: (f) => {
          const copy_button = f.querySelector(
            'button.copy-response-button'
          ) as HTMLElement
          if (!copy_button) {
            report_initialization_error({
              function_name: 'open_webui.perform_copy',
              log_message: 'Copy button not found',
              alert_message: 'Unable to copy response'
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
      chatbot_name: 'Open WebUI',
      is_generating: () =>
        !!document.querySelector(
          'path[d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm6-2.438c0-.724.588-1.312 1.313-1.312h4.874c.725 0 1.313.588 1.313 1.313v4.874c0 .725-.588 1.313-1.313 1.313H9.564a1.312 1.312 0 01-1.313-1.313V9.564z"]'
        ),
      footer_selector: '.chat-assistant + div',
      add_buttons
    })
  }
}
