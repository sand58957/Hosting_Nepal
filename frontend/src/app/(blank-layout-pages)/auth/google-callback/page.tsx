'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'
import Typography from '@mui/material/Typography'
import Alert from '@mui/material/Alert'

import api from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'

const GoogleCallbackPage = () => {
  const router = useRouter()
  const { login } = useAuthStore()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash
    const params = new URLSearchParams(hash)
    const accessToken = params.get('accessToken')
    const refreshToken = params.get('refreshToken')

    if (!accessToken) {
      setError('Sign-in did not return a token. Please try again.')
      return
    }

    // Strip the hash so tokens don't linger in history before we navigate.
    window.history.replaceState(null, '', window.location.pathname)

    api
      .get('/auth/me', { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((res) => {
        const user = res.data?.data ?? res.data
        if (!user?.id) throw new Error('Profile fetch returned no user')
        login(user, accessToken, refreshToken || undefined)
        router.replace('/dashboard')
      })
      .catch((err) => {
        const apiMsg = err?.response?.data?.message
        const msg = Array.isArray(apiMsg) ? apiMsg.join(', ') : apiMsg
        setError(msg || 'Could not complete Google sign-in. Please try again.')
      })
  }, [login, router])

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 3,
        p: 4,
      }}
    >
      {error ? (
        <>
          <Alert severity='error' sx={{ maxWidth: 480 }}>
            {error}
          </Alert>
          <Typography
            component='a'
            href='/login'
            color='primary.main'
            sx={{ cursor: 'pointer' }}
          >
            Back to login
          </Typography>
        </>
      ) : (
        <>
          <CircularProgress />
          <Typography variant='body1' color='text.secondary'>
            Signing you in with Google…
          </Typography>
        </>
      )}
    </Box>
  )
}

export default GoogleCallbackPage
