import { Donations, DonationsProps } from './Donations'
import { useState } from 'react'

export default {
  component: Donations
}

const sample_donations: DonationsProps['donations'] = [
  {
    support_message:
      '<span class="suppUsername"><a href="https://github.com/johndoe">JohnDoe</a></span> bought 2 coffees.',
    support_note: 'Great work! Keep it up.'
  },
  {
    support_message: '<strong>Jane Smith</strong> bought 5 coffees.',
    support_note: ''
  },
  {
    support_message: '<strong>John Doe</strong> bought 1 coffee.',
    support_note: 'Happy to help!'
  }
]

export const Default = () => {
  const [visible, set_visible] = useState(true)

  return (
    <Donations
      donations={sample_donations}
      is_fetching={false}
      is_revalidating={false}
      are_donations_visible={visible}
      donations_fetched_once={true}
      on_toggle_donations_visibility={() => set_visible(!visible)}
      on_fetch_next_page={() => console.log('Fetching next page…')}
      has_more={false}
    />
  )
}

export const Loading = () => {
  const [visible, set_visible] = useState(true)

  return (
    <Donations
      is_fetching={true}
      is_revalidating={false}
      are_donations_visible={visible}
      donations_fetched_once={false}
      on_toggle_donations_visibility={() => set_visible(!visible)}
      on_fetch_next_page={() => console.log('Fetching next page…')}
      has_more={false}
    />
  )
}

export const Revalidating = () => {
  const [visible, setVisible] = useState(true)

  return (
    <Donations
      donations={sample_donations}
      is_fetching={false}
      is_revalidating={true}
      are_donations_visible={visible}
      donations_fetched_once={true}
      on_toggle_donations_visibility={() => setVisible(!visible)}
      on_fetch_next_page={() => console.log('Fetching next page…')}
      has_more={true}
    />
  )
}
