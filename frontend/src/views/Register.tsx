'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import InputAdornment from '@mui/material/InputAdornment'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'

import classnames from 'classnames'

import type { SystemMode } from '@core/types'

import Link from '@components/Link'
import Logo from '@components/layout/shared/Logo'
import CustomTextField from '@core/components/mui/TextField'

import { useSettings } from '@core/hooks/useSettings'

import api from '@/lib/api'

const Register = ({ mode: _mode }: { mode: SystemMode }) => {
  const [isPasswordShown, setIsPasswordShown] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const router = useRouter()
  const { settings } = useSettings()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const normalizedPhone = phone.replace(/[\s\-()]/g, '')

      await api.post('/auth/register', { name, email, phone: normalizedPhone, password })
      setSuccess('Registration successful! Please check your email to verify your account.')
    } catch (err: unknown) {
      const apiErr = err as { response?: { data?: { message?: string | string[] } } }
      const msg = apiErr?.response?.data?.message

      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Registration failed. Please try again.')
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
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, maxWidth: 480, padding: '0 24px' }}>
          {/* Registration / launch-your-site illustration */}
          <svg viewBox='0 0 420 340' fill='none' width='400' style={{ filter: 'drop-shadow(0 20px 40px rgba(40,199,111,0.15))' }}>
            <defs>
              <radialGradient id='registerGlow' cx='50%' cy='50%' r='50%'>
                <stop offset='0%' stopColor='#28C76F' stopOpacity='0.2' />
                <stop offset='100%' stopColor='transparent' stopOpacity='0' />
              </radialGradient>
              <linearGradient id='browserBar' x1='0' y1='0' x2='1' y2='0'>
                <stop offset='0%' stopColor='rgba(40,199,111,0.25)' />
                <stop offset='100%' stopColor='rgba(115,103,240,0.25)' />
              </linearGradient>
            </defs>

            {/* Ambient glow */}
            <circle cx='210' cy='170' r='140' fill='url(#registerGlow)' />

            {/* Browser window (live site preview) */}
            <rect x='90' y='60' width='240' height='170' rx='14' fill='rgba(255,255,255,0.04)' stroke='rgba(255,255,255,0.12)' strokeWidth='1.5' />
            {/* Window chrome */}
            <rect x='90' y='60' width='240' height='28' rx='14' fill='rgba(255,255,255,0.03)' />
            <rect x='90' y='76' width='240' height='12' fill='rgba(255,255,255,0.03)' />
            <circle cx='105' cy='74' r='4' fill='#EA5455' />
            <circle cx='120' cy='74' r='4' fill='#FF9F43' />
            <circle cx='135' cy='74' r='4' fill='#28C76F' />
            {/* URL bar */}
            <rect x='155' y='68' width='155' height='14' rx='7' fill='rgba(255,255,255,0.06)' stroke='rgba(40,199,111,0.3)' strokeWidth='1' />
            <circle cx='165' cy='75' r='3' fill='#28C76F' />
            <text x='175' y='78' fill='rgba(255,255,255,0.6)' fontSize='9' fontFamily='inherit'>yourdomain.com.np</text>

            {/* Hero content inside preview */}
            <rect x='106' y='105' width='90' height='8' rx='4' fill='rgba(255,255,255,0.4)' />
            <rect x='106' y='120' width='160' height='5' rx='2.5' fill='rgba(255,255,255,0.18)' />
            <rect x='106' y='130' width='140' height='5' rx='2.5' fill='rgba(255,255,255,0.18)' />
            <rect x='106' y='148' width='60' height='18' rx='9' fill='url(#browserBar)' />
            <text x='136' y='160' textAnchor='middle' fill='#fff' fontSize='8' fontWeight='bold' fontFamily='inherit'>Launch</text>

            {/* Mini charts in preview */}
            <rect x='220' y='105' width='92' height='58' rx='8' fill='rgba(255,255,255,0.03)' stroke='rgba(255,255,255,0.06)' strokeWidth='1' />
            <polyline points='228,148 240,140 252,143 264,130 276,135 288,122 300,128'
              fill='none' stroke='#28C76F' strokeWidth='1.5' strokeLinecap='round' />
            <circle cx='300' cy='128' r='2.5' fill='#28C76F' />

            {/* Uptime/performance badges inside preview */}
            <rect x='106' y='180' width='58' height='22' rx='6' fill='rgba(40,199,111,0.1)' stroke='rgba(40,199,111,0.3)' strokeWidth='1' />
            <text x='135' y='194' textAnchor='middle' fill='#28C76F' fontSize='8' fontWeight='bold' fontFamily='inherit'>99.9% UP</text>
            <rect x='170' y='180' width='50' height='22' rx='6' fill='rgba(115,103,240,0.1)' stroke='rgba(115,103,240,0.3)' strokeWidth='1' />
            <text x='195' y='194' textAnchor='middle' fill='#A89CF5' fontSize='8' fontWeight='bold' fontFamily='inherit'>NVMe</text>
            <rect x='226' y='180' width='64' height='22' rx='6' fill='rgba(255,159,67,0.1)' stroke='rgba(255,159,67,0.3)' strokeWidth='1' />
            <text x='258' y='194' textAnchor='middle' fill='#FF9F43' fontSize='8' fontWeight='bold' fontFamily='inherit'>LiteSpeed</text>

            {/* Service tiles below browser */}
            <g>
              <rect x='50' y='250' width='70' height='60' rx='10' fill='rgba(40,199,111,0.08)' stroke='rgba(40,199,111,0.25)' strokeWidth='1' />
              <circle cx='85' cy='272' r='8' fill='rgba(40,199,111,0.15)' stroke='#28C76F' strokeWidth='1.5' />
              <path d='M80 272 L84 276 L90 268' stroke='#28C76F' strokeWidth='1.5' fill='none' strokeLinecap='round' strokeLinejoin='round' />
              <text x='85' y='298' textAnchor='middle' fill='rgba(255,255,255,0.6)' fontSize='8' fontWeight='600' fontFamily='inherit'>Domain</text>
            </g>
            <g>
              <rect x='135' y='250' width='70' height='60' rx='10' fill='rgba(115,103,240,0.08)' stroke='rgba(115,103,240,0.25)' strokeWidth='1' />
              <rect x='160' y='262' width='20' height='14' rx='2' fill='rgba(115,103,240,0.15)' stroke='#7367F0' strokeWidth='1.5' />
              <circle cx='170' cy='269' r='2.5' fill='#7367F0' />
              <text x='170' y='298' textAnchor='middle' fill='rgba(255,255,255,0.6)' fontSize='8' fontWeight='600' fontFamily='inherit'>Hosting</text>
            </g>
            <g>
              <rect x='220' y='250' width='70' height='60' rx='10' fill='rgba(255,159,67,0.08)' stroke='rgba(255,159,67,0.25)' strokeWidth='1' />
              <path d='M255 262 L247 270 L247 278 C247 282 250 285 255 286 C260 285 263 282 263 278 L263 270 Z' fill='rgba(255,159,67,0.15)' stroke='#FF9F43' strokeWidth='1.5' strokeLinejoin='round' />
              <text x='255' y='298' textAnchor='middle' fill='rgba(255,255,255,0.6)' fontSize='8' fontWeight='600' fontFamily='inherit'>SSL</text>
            </g>
            <g>
              <rect x='305' y='250' width='70' height='60' rx='10' fill='rgba(0,207,232,0.08)' stroke='rgba(0,207,232,0.25)' strokeWidth='1' />
              <rect x='326' y='264' width='28' height='18' rx='2' fill='rgba(0,207,232,0.12)' stroke='#00CFE8' strokeWidth='1.5' />
              <path d='M326 268 L340 275 L354 268' stroke='#00CFE8' strokeWidth='1.5' fill='none' strokeLinecap='round' />
              <text x='340' y='298' textAnchor='middle' fill='rgba(255,255,255,0.6)' fontSize='8' fontWeight='600' fontFamily='inherit'>Email</text>
            </g>

            {/* Connection lines from browser to tiles */}
            <path d='M130 230 Q100 240 85 250' stroke='rgba(40,199,111,0.3)' strokeWidth='1.2' strokeDasharray='3 3' fill='none'>
              <animate attributeName='stroke-dashoffset' from='0' to='-12' dur='1.5s' repeatCount='indefinite' />
            </path>
            <path d='M175 230 L170 250' stroke='rgba(115,103,240,0.3)' strokeWidth='1.2' strokeDasharray='3 3' fill='none'>
              <animate attributeName='stroke-dashoffset' from='0' to='-12' dur='1.8s' repeatCount='indefinite' />
            </path>
            <path d='M245 230 L255 250' stroke='rgba(255,159,67,0.3)' strokeWidth='1.2' strokeDasharray='3 3' fill='none'>
              <animate attributeName='stroke-dashoffset' from='0' to='-12' dur='2.1s' repeatCount='indefinite' />
            </path>
            <path d='M290 230 Q320 240 340 250' stroke='rgba(0,207,232,0.3)' strokeWidth='1.2' strokeDasharray='3 3' fill='none'>
              <animate attributeName='stroke-dashoffset' from='0' to='-12' dur='2.4s' repeatCount='indefinite' />
            </path>

            {/* Pulse indicator on URL bar */}
            <circle cx='165' cy='75' r='5' fill='none' stroke='rgba(40,199,111,0.5)' strokeWidth='1'>
              <animate attributeName='r' values='3;9' dur='1.6s' repeatCount='indefinite' />
              <animate attributeName='opacity' values='0.8;0' dur='1.6s' repeatCount='indefinite' />
            </circle>
          </svg>

          <div style={{ textAlign: 'center' }}>
            <p style={{ color: '#fff', fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>Launch your site in minutes</p>
            <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.9rem', lineHeight: 1.6, maxWidth: 360, margin: '0 auto' }}>
              Register once to get a .np or .com.np domain, managed hosting, free SSL, and Nepali payment integrations in one dashboard.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
              {['NPR pricing', 'Khalti & eSewa', '24/7 Nepal support'].map(badge => (
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
            <Typography variant='h4'>Create your Hosting Nepal account</Typography>
            <Typography>Start with a free trial — no credit card required.</Typography>
          </div>

          {error && (
            <Alert severity='error' onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity='success'>
              {success}
            </Alert>
          )}

          {!success && (
            <form noValidate autoComplete='off' onSubmit={handleSubmit} className='flex flex-col gap-5'>
              <CustomTextField
                autoFocus
                fullWidth
                label='Full Name'
                placeholder='Enter your full name'
                value={name}
                onChange={(e) => setName(e.target.value)}
                slotProps={{ htmlInput: { autoComplete: 'name' } }}
              />
              <CustomTextField
                fullWidth
                label='Email'
                placeholder='Enter your email'
                type='email'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                slotProps={{ htmlInput: { autoComplete: 'email', inputMode: 'email' } }}
              />
              <CustomTextField
                fullWidth
                label='Phone Number'
                placeholder='9812345678 or +9779812345678'
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                slotProps={{ htmlInput: { autoComplete: 'tel', inputMode: 'tel' } }}
                helperText='10-digit Nepal mobile (starts with 96-99). Country code optional.'
              />
              <CustomTextField
                fullWidth
                label='Password'
                placeholder='At least 8 chars, 1 upper, 1 lower, 1 number'
                type={isPasswordShown ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                slotProps={{
                  htmlInput: { autoComplete: 'new-password' },
                  input: {
                    endAdornment: (
                      <InputAdornment position='end'>
                        <IconButton
                          edge='end'
                          onClick={() => setIsPasswordShown(!isPasswordShown)}
                          onMouseDown={(e) => e.preventDefault()}
                        >
                          <i className={isPasswordShown ? 'tabler-eye-off' : 'tabler-eye'} />
                        </IconButton>
                      </InputAdornment>
                    )
                  }
                }}
              />
              <Button fullWidth variant='contained' type='submit' disabled={loading}>
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>
              <div className='flex justify-center items-center flex-wrap gap-2'>
                <Typography>Already have an account?</Typography>
                <Typography component={Link} href='/login' color='primary.main'>
                  Sign in
                </Typography>
              </div>
            </form>
          )}

          {success && (
            <Button fullWidth variant='contained' onClick={() => router.push('/login')}>
              Go to Login
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default Register
