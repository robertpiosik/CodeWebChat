import { RecentDonations, RecentDonationsProps } from './RecentDonations'

export default {
  component: RecentDonations
}

const sample_translations = {
  about:
    'Hey there! Donating is a great way to show your support for the project. Thank you!',
  platforms: 'Platforms',
  wallets: 'Wallets',
  scan_qr: 'Scan QR'
}

const sample_donations: RecentDonationsProps['donations'] = [
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
  return (
    <RecentDonations
      donations={sample_donations}
      is_fetching={false}
      on_show_qr_code={(wallet) => console.log('Show QR code', wallet)}
      is_revalidating={false}
      on_fetch_next_page={() => console.log('Fetching next page…')}
      has_more={false}
      translations={sample_translations}
    />
  )
}

export const Loading = () => {
  return (
    <RecentDonations
      is_fetching={true}
      on_show_qr_code={(wallet) => console.log('Show QR code', wallet)}
      is_revalidating={false}
      on_fetch_next_page={() => console.log('Fetching next page…')}
      has_more={false}
      translations={sample_translations}
    />
  )
}

export const Revalidating = () => {
  return (
    <RecentDonations
      donations={sample_donations}
      on_show_qr_code={(wallet) => console.log('Show QR code', wallet)}
      is_fetching={false}
      is_revalidating={true}
      on_fetch_next_page={() => console.log('Fetching next page…')}
      has_more={true}
      translations={sample_translations}
    />
  )
}
