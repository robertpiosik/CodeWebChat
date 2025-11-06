import { useState } from 'react'
import { Dropdown } from './Dropdown'

export default {
  component: Dropdown
}

const sample_options: Dropdown.Option<string>[] = [
  { value: 'option1', label: 'Option 1' },
  { value: 'option2', label: 'This is a much longer option label' },
  { value: 'option3', label: 'Option 3' }
]

export const Default = () => {
  const [value, set_value] = useState('option1')

  return (
    <div style={{ width: '220px' }}>
      <Dropdown options={sample_options} value={value} onChange={set_value} />
    </div>
  )
}
