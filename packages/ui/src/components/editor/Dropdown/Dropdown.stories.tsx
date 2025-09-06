import { Dropdown } from './Dropdown'
import { useState } from 'react'

export default {
  component: Dropdown
}

export const Default = () => {
  const options = [
    { value: 'option1', label: 'Option 1' },
    { value: 'option2', label: 'Option 2' },
    { value: 'option3', label: 'Option 3 That Is Very Long' }
  ]
  const [selected, set_selected] = useState<string>('option1')

  return (
    <div style={{ width: '200px' }}>
      <Dropdown
        options={options}
        selected_value={selected}
        on_change={set_selected}
      />
    </div>
  )
}

export const WithPlaceholder = () => {
  const options = [
    { value: 'apple', label: 'Apple' },
    { value: 'banana', label: 'Banana' },
    { value: 'orange', label: 'Orange' }
  ]
  const [selected, set_selected] = useState<string>('apple')

  return (
    <div style={{ width: '200px' }}>
      <Dropdown
        options={options}
        selected_value={selected}
        on_change={set_selected}
      />
    </div>
  )
}

export const LongList = () => {
  const options = Array.from({ length: 20 }, (_, i) => ({
    value: `item${i + 1}`,
    label: `Item ${i + 1}`
  }))
  const [selected, set_selected] = useState<string>('item1')

  return (
    <div style={{ width: '200px' }}>
      <Dropdown
        options={options}
        selected_value={selected}
        on_change={set_selected}
      />
    </div>
  )
}
