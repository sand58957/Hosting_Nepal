import { redirect } from 'next/navigation'

export default function BillingWalletPage() {
  redirect('/billing?tab=wallet')
}
