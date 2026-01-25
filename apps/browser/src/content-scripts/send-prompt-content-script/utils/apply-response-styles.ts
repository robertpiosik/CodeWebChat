export const apply_chat_response_button_style = (button: HTMLButtonElement) => {
  button.style.margin = '4px 8px'
  button.style.padding = '6px 9px'
  button.style.borderRadius = '999px'
  button.style.backgroundColor = '#fbb100'
  button.style.cursor = 'pointer'
  button.style.border = 'none'
  button.style.display = 'flex'
  button.style.alignItems = 'center'

  const svg = button.querySelector('svg')
  if (svg) {
    svg.style.height = '13px'
  }
}

export const set_button_disabled_state = (button: HTMLButtonElement) => {
  button.disabled = true
  button.style.opacity = '0.5'
  button.style.cursor = ''

  setTimeout(() => {
    button.disabled = false
    button.style.opacity = ''
    button.style.cursor = 'pointer'
  }, 3000)
}
