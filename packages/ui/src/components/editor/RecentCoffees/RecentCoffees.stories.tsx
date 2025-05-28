import { RecentCoffees } from './RecentCoffees'

export default {
  component: RecentCoffees
}

export const Default = () => (
  <div style={{ width: '300px' }}>
    <RecentCoffees
      coffees={[
        {
          name: 'Alice',
          note: 'First donor!'
        },
        {
          name: 'Bob',
          note: 'Thanks!'
        },
        {
          name: 'Charlie',
          note: 'Keep up the good work!'
        }
      ]}
    />
  </div>
)
