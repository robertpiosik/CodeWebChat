const apply_response_text = 'apply response'
const apply_response_selector =
  'button, [role="button"], input[type="button"], input[type="submit"], a'

const normalize_text = (value: string | null | undefined) =>
  value?.replace(/\s+/g, ' ').trim().toLowerCase() ?? ''

const is_visible = (element: HTMLElement) => {
  const style = window.getComputedStyle(element)
  return (
    !element.hidden &&
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.pointerEvents !== 'none'
  )
}

const is_disabled = (element: HTMLElement) => {
  if (
    element instanceof HTMLButtonElement ||
    element instanceof HTMLInputElement
  ) {
    if (element.disabled) return true
  }

  return element.getAttribute('aria-disabled') === 'true'
}

const says_apply_response = (element: HTMLElement) => {
  if (element.classList.contains('cwc-apply-response-button')) return true

  const labels = [
    element.textContent,
    element.getAttribute('aria-label'),
    element.getAttribute('title'),
    element instanceof HTMLInputElement ? element.value : null
  ]

  return labels.some((label) => normalize_text(label) === apply_response_text)
}

const get_apply_response_control = () => {
  const controls = Array.from(
    document.querySelectorAll<HTMLElement>(apply_response_selector)
  )

  return controls
    .reverse()
    .find(
      (element) =>
        says_apply_response(element) &&
        !is_disabled(element) &&
        is_visible(element)
    )
}

export const click_site_apply_response = () => {
  let last_clicked_control: HTMLElement | null = null
  let scan_scheduled = false

  const scan = () => {
    scan_scheduled = false
    const control = get_apply_response_control()

    if (!control) {
      last_clicked_control = null
      return
    }

    if (control === last_clicked_control) return

    last_clicked_control = control
    control.click()
  }

  const schedule_scan = () => {
    if (scan_scheduled) return
    scan_scheduled = true
    requestAnimationFrame(scan)
  }

  const observer = new MutationObserver(schedule_scan)
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: [
      'aria-disabled',
      'aria-label',
      'class',
      'disabled',
      'hidden',
      'style',
      'title',
      'value'
    ]
  })

  schedule_scan()
}
