import { redirect } from 'next/navigation'

export default function BillingOrdersPage() {
  redirect('/billing?tab=orders')
}
