'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import CircularProgress from '@mui/material/CircularProgress'
import Box from '@mui/material/Box'

import { useAuthStore } from '@/store/auth.store'

interface AuthGuardProps {
  children: React.ReactNode
}

const AuthGuard = ({ children }: AuthGuardProps) => {
  const router = useRouter()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login')
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    )
  }

  return <>{children}</>
}

export default AuthGuard
