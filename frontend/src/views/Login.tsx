'use client'

// React Imports
import { useState } from 'react'

// Next Imports
import { useRouter } from 'next/navigation'

// MUI Imports
import useMediaQuery from '@mui/material/useMediaQuery'
import { styled, useTheme } from '@mui/material/styles'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Checkbox from '@mui/material/Checkbox'
import Button from '@mui/material/Button'
import FormControlLabel from '@mui/material/FormControlLabel'
import Alert from '@mui/material/Alert'

// Third-party Imports
import classnames from 'classnames'

// Type Imports
import type { SystemMode } from '@core/types'

// Component Imports
import Link from '@components/Link'
import Logo from '@components/layout/shared/Logo'
import CustomTextField from '@core/components/mui/TextField'

// Config Imports
import themeConfig from '@configs/themeConfig'

// Hook Imports
import { useImageVariant } from '@core/hooks/useImageVariant'
import { useSettings } from '@core/hooks/useSettings'

// Store & API Imports
import api from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'

// Styled Custom Components
const LoginIllustration = styled('img')(({ theme }) => ({
  zIndex: 2,
  blockSize: 'auto',
  maxBlockSize: 680,
  maxInlineSize: '100%',
  margin: theme.spacing(12),
  [theme.breakpoints.down(1536)]: {
    maxBlockSize: 550
  },
  [theme.breakpoints.down('lg')]: {
    maxBlockSize: 450
  }
}))

const MaskImg = styled('img')({
  blockSize: 'auto',
  maxBlockSize: 355,
  inlineSize: '100%',
  position: 'absolute',
  insetBlockEnd: 0,
  zIndex: -1
})

const LoginV2 = ({ mode }: { mode: SystemMode }) => {
  // States
  const [isPasswordShown, setIsPasswordShown] = useState(false)
  const [emailValue, setEmailValue] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Vars
  const darkImg = '/images/pages/auth-mask-dark.png'
  const lightImg = '/images/pages/auth-mask-light.png'
  const darkIllustration = '/images/illustrations/auth/v2-login-dark.png'
  const lightIllustration = '/images/illustrations/auth/v2-login-light.png'
  const borderedDarkIllustration = '/images/illustrations/auth/v2-login-dark-border.png'
  const borderedLightIllustration = '/images/illustrations/auth/v2-login-light-border.png'

  // Hooks
  const router = useRouter()
  const { settings } = useSettings()
  const theme = useTheme()
  const hidden = useMediaQuery(theme.breakpoints.down('md'))
  const authBackground = useImageVariant(mode, lightImg, darkImg)
  const { login } = useAuthStore()

  const characterIllustration = useImageVariant(
    mode,
    lightIllustration,
    darkIllustration,
    borderedLightIllustration,
    borderedDarkIllustration
  )

  const handleClickShowPassword = () => setIsPasswordShown(show => !show)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.post('/auth/login', { email: emailValue, password })
      const data = response.data.data

      if (data?.user && data?.accessToken) {
        login(data.user, data.accessToken, data.refreshToken)
        router.push('/dashboard')
      } else {
        setError('Invalid response from server.')
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      setError(error?.response?.data?.message || 'Login failed. Please check your credentials.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='flex bs-full justify-center'>
      <div
        className={classnames(
          'flex bs-full items-center justify-center flex-1 min-bs-[100dvh] relative p-6 max-md:hidden',
          {
            'border-ie': settings.skin === 'bordered'
          }
        )}
        style={{ background: 'linear-gradient(-45deg, #0f0f1a, #1a1a2e, #16213e, #0f0f1a)', overflow: 'hidden' }}
      >
        {/* Hosting-themed illustration */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, maxWidth: 480, padding: '0 24px' }}>
          {/* Animated server rack */}
          <svg viewBox='0 0 400 320' fill='none' width='380' style={{ filter: 'drop-shadow(0 20px 40px rgba(115,103,240,0.15))' }}>
            {/* Glow background */}
            <circle cx='200' cy='160' r='130' fill='url(#loginGlow)' opacity='0.5' />
            {/* Server rack body */}
            <rect x='100' y='40' width='200' height='240' rx='16' fill='rgba(255,255,255,0.04)' stroke='rgba(255,255,255,0.1)' strokeWidth='1.5' />
            {/* Server unit 1 */}
            <rect x='120' y='60' width='160' height='40' rx='8' fill='rgba(115,103,240,0.12)' stroke='rgba(115,103,240,0.3)' strokeWidth='1' />
            <circle cx='145' cy='80' r='4' fill='#28C76F'><animate attributeName='opacity' values='1;0.3;1' dur='2s' repeatCount='indefinite' /></circle>
            <circle cx='160' cy='80' r='4' fill='#28C76F'><animate attributeName='opacity' values='1;0.3;1' dur='2.3s' repeatCount='indefinite' /></circle>
            <rect x='200' y='74' width='60' height='4' rx='2' fill='rgba(255,255,255,0.15)' />
            <rect x='200' y='82' width='40' height='4' rx='2' fill='rgba(255,255,255,0.08)' />
            {/* Server unit 2 */}
            <rect x='120' y='110' width='160' height='40' rx='8' fill='rgba(40,199,111,0.08)' stroke='rgba(40,199,111,0.25)' strokeWidth='1' />
            <circle cx='145' cy='130' r='4' fill='#7367F0'><animate attributeName='opacity' values='0.3;1;0.3' dur='1.8s' repeatCount='indefinite' /></circle>
            <circle cx='160' cy='130' r='4' fill='#28C76F'><animate attributeName='opacity' values='1;0.5;1' dur='2.5s' repeatCount='indefinite' /></circle>
            <rect x='200' y='124' width='55' height='4' rx='2' fill='rgba(255,255,255,0.15)' />
            <rect x='200' y='132' width='35' height='4' rx='2' fill='rgba(255,255,255,0.08)' />
            {/* Server unit 3 */}
            <rect x='120' y='160' width='160' height='40' rx='8' fill='rgba(255,159,67,0.08)' stroke='rgba(255,159,67,0.2)' strokeWidth='1' />
            <circle cx='145' cy='180' r='4' fill='#FF9F43'><animate attributeName='opacity' values='1;0.4;1' dur='3s' repeatCount='indefinite' /></circle>
            <circle cx='160' cy='180' r='4' fill='#28C76F' />
            <rect x='200' y='174' width='50' height='4' rx='2' fill='rgba(255,255,255,0.15)' />
            <rect x='200' y='182' width='30' height='4' rx='2' fill='rgba(255,255,255,0.08)' />
            {/* Server unit 4 */}
            <rect x='120' y='210' width='160' height='40' rx='8' fill='rgba(0,186,209,0.08)' stroke='rgba(0,186,209,0.2)' strokeWidth='1' />
            <circle cx='145' cy='230' r='4' fill='#00BAD1'><animate attributeName='opacity' values='0.5;1;0.5' dur='2.2s' repeatCount='indefinite' /></circle>
            <circle cx='160' cy='230' r='4' fill='#28C76F'><animate attributeName='opacity' values='1;0.3;1' dur='1.5s' repeatCount='indefinite' /></circle>
            <rect x='200' y='224' width='45' height='4' rx='2' fill='rgba(255,255,255,0.15)' />
            <rect x='200' y='232' width='25' height='4' rx='2' fill='rgba(255,255,255,0.08)' />
            {/* Connection lines from server */}
            <path d='M300 80 Q340 80 350 50' stroke='rgba(115,103,240,0.3)' strokeWidth='1.5' strokeDasharray='4 3' fill='none'>
              <animate attributeName='stroke-dashoffset' from='0' to='-14' dur='1.5s' repeatCount='indefinite' />
            </path>
            <path d='M300 130 Q350 130 370 110' stroke='rgba(40,199,111,0.3)' strokeWidth='1.5' strokeDasharray='4 3' fill='none'>
              <animate attributeName='stroke-dashoffset' from='0' to='-14' dur='2s' repeatCount='indefinite' />
            </path>
            <path d='M100 180 Q60 180 40 150' stroke='rgba(255,159,67,0.3)' strokeWidth='1.5' strokeDasharray='4 3' fill='none'>
              <animate attributeName='stroke-dashoffset' from='0' to='14' dur='1.8s' repeatCount='indefinite' />
            </path>
            {/* Globe node */}
            <circle cx='355' cy='45' r='18' fill='rgba(115,103,240,0.1)' stroke='rgba(115,103,240,0.3)' strokeWidth='1' />
            <text x='355' y='50' textAnchor='middle' fill='rgba(255,255,255,0.5)' fontSize='14' fontFamily='inherit'>W</text>
            {/* Cloud node */}
            <circle cx='375' cy='105' r='15' fill='rgba(40,199,111,0.1)' stroke='rgba(40,199,111,0.25)' strokeWidth='1' />
            <text x='375' y='110' textAnchor='middle' fill='rgba(255,255,255,0.4)' fontSize='12' fontFamily='inherit'>C</text>
            {/* Shield node */}
            <circle cx='35' cy='145' r='16' fill='rgba(255,159,67,0.1)' stroke='rgba(255,159,67,0.25)' strokeWidth='1' />
            <text x='35' y='150' textAnchor='middle' fill='rgba(255,255,255,0.4)' fontSize='12' fontFamily='inherit'>S</text>
            {/* Pulse rings */}
            <circle cx='200' cy='160' r='20' fill='none' stroke='rgba(115,103,240,0.15)' strokeWidth='1'>
              <animate attributeName='r' values='120;160' dur='3s' repeatCount='indefinite' />
              <animate attributeName='opacity' values='0.2;0' dur='3s' repeatCount='indefinite' />
            </circle>
            <defs>
              <radialGradient id='loginGlow' cx='50%' cy='50%' r='50%'>
                <stop offset='0%' stopColor='#7367F0' stopOpacity='0.15' />
                <stop offset='100%' stopColor='transparent' stopOpacity='0' />
              </radialGradient>
            </defs>
          </svg>
          {/* Text below illustration */}
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>Hosting Nepal</p>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem', lineHeight: 1.6, maxWidth: 340, margin: '0 auto' }}>
              Domain, WordPress, VPS, and Dedicated Servers with NVMe SSD, free SSL, and local NPR payment.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 20 }}>
              {['99.9% Uptime', 'NVMe SSD', 'Free SSL'].map(badge => (
                <span key={badge} style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: '0.7rem', fontWeight: 600,
                  background: 'rgba(40,199,111,0.1)', color: '#28C76F', border: '1px solid rgba(40,199,111,0.2)'
                }}>{badge}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className='flex justify-center items-center bs-full bg-backgroundPaper !min-is-full p-6 md:!min-is-[unset] md:p-12 md:is-[480px]'>
        <Link className='absolute block-start-5 sm:block-start-[33px] inline-start-6 sm:inline-start-[38px]'>
          <Logo />
        </Link>
        <div className='flex flex-col gap-6 is-full sm:is-auto md:is-full sm:max-is-[400px] md:max-is-[unset] mbs-11 sm:mbs-14 md:mbs-0'>
          <div className='flex flex-col gap-1'>
            <Typography variant='h4'>{`Welcome to ${themeConfig.templateName}!`}</Typography>
            <Typography>Please sign in to your account to continue</Typography>
          </div>

          {error && (
            <Alert severity='error' onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <form noValidate autoComplete='off' onSubmit={handleSubmit} className='flex flex-col gap-5'>
            <CustomTextField
              autoFocus
              fullWidth
              label='Email'
              placeholder='Enter your email'
              value={emailValue}
              onChange={(e) => setEmailValue(e.target.value)}
              type='email'
            />
            <CustomTextField
              fullWidth
              label='Password'
              placeholder='Enter your password'
              id='outlined-adornment-password'
              type={isPasswordShown ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position='end'>
                      <IconButton edge='end' onClick={handleClickShowPassword} onMouseDown={e => e.preventDefault()}>
                        <i className={isPasswordShown ? 'tabler-eye-off' : 'tabler-eye'} />
                      </IconButton>
                    </InputAdornment>
                  )
                }
              }}
            />
            <div className='flex justify-between items-center gap-x-3 gap-y-1 flex-wrap'>
              <FormControlLabel control={<Checkbox />} label='Remember me' />
              <Typography
                className='text-end'
                color='primary.main'
                component={Link}
                href='/forgot-password'
              >
                Forgot password?
              </Typography>
            </div>
            <Button fullWidth variant='contained' type='submit' disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
            <div className='flex justify-center items-center flex-wrap gap-2'>
              <Typography>New on our platform?</Typography>
              <Typography component={Link} href='/register' color='primary.main'>
                Create an account
              </Typography>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default LoginV2
