export const get_caret_position_from_div = (element: HTMLElement): number => {
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) {
    return 0
  }
  const range = selection.getRangeAt(0)
  const pre_caret_range = range.cloneRange()
  pre_caret_range.selectNodeContents(element)
  pre_caret_range.setEnd(range.endContainer, range.endOffset)
  return pre_caret_range.toString().length
}

export const set_caret_position_for_div = (
  element: HTMLElement,
  position: number
) => {
  const selection = window.getSelection()
  if (!selection) return
  const range = document.createRange()
  let char_count = 0
  let found = false

  const find_text_node_and_offset = (node: Node) => {
    if (found) return
    if (node.nodeType == Node.TEXT_NODE) {
      const text_node = node as Text
      const next_char_count = char_count + text_node.length
      if (position >= char_count && position <= next_char_count) {
        range.setStart(node, position - char_count)
        range.collapse(true)
        found = true
      } else {
        char_count = next_char_count
      }
    } else {
      if (
        node.nodeType == Node.ELEMENT_NODE &&
        (node as HTMLElement).getAttribute('contenteditable') == 'false'
      ) {
        const text_len = node.textContent?.length ?? 0
        const next_char_count = char_count + text_len
        if (position >= char_count && position <= next_char_count) {
          range.setStartAfter(node)
          range.collapse(true)
          found = true
        } else {
          char_count = next_char_count
        }
        return // Do not iterate over children
      }
      for (let i = 0; i < node.childNodes.length; i++) {
        find_text_node_and_offset(node.childNodes[i])
        if (found) break
      }
    }
  }

  find_text_node_and_offset(element)
  if (found) {
    selection.removeAllRanges()
    selection.addRange(range)
  } else {
    range.selectNodeContents(element)
    range.collapse(false)
    selection.removeAllRanges()
    selection.addRange(range)
  }
}
