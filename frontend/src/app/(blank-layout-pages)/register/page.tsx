// Next Imports
import type { Metadata } from 'next'

// Component Imports
import Register from '@views/Register'

// Server Action Imports
import { getServerMode } from '@core/utils/serverHelpers'

export const metadata: Metadata = {
  title: 'Register',
  description: 'Create a new account'
}

const RegisterPage = async () => {
  const mode = await getServerMode()

  return <Register mode={mode} />
}

export default RegisterPage
