'use client'

import { useState, useEffect } from 'react'
import Box from '@mui/material/Box'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api/v1'

const WhatsAppButton = () => {
  const [config, setConfig] = useState({ whatsappNumber: '9779802348957', whatsappMessage: 'Hello Hosting Nepal! I need help with your hosting services.', whatsappEnabled: true })

  useEffect(() => {
    fetch(`${API_URL}/site-config`).then(r => r.json()).then(d => {
      const data = d?.data ?? d
      if (data?.whatsappNumber) setConfig(data)
    }).catch(() => {})
  }, [])

  if (!config.whatsappEnabled) return null

  return (
  <Box
    onClick={() => window.open(`https://wa.me/${config.whatsappNumber}?text=${encodeURIComponent(config.whatsappMessage)}`, '_blank')}
    sx={{
      position: 'fixed', bottom: { xs: 20, md: 28 }, right: { xs: 20, md: 28 }, zIndex: 1200,
      width: 60, height: 60, borderRadius: '50%',
      bgcolor: '#25D366', color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', boxShadow: '0 4px 20px rgba(37,211,102,0.4)',
      transition: 'all 0.3s ease',
      '&:hover': { transform: 'scale(1.1)', boxShadow: '0 6px 28px rgba(37,211,102,0.55)' },
      '&::before': {
        content: '""', position: 'absolute', width: '100%', height: '100%', borderRadius: '50%',
        bgcolor: '#25D366', opacity: 0.3, animation: 'whatsappPulse 2s ease-in-out infinite',
      },
      '@keyframes whatsappPulse': {
        '0%': { transform: 'scale(1)', opacity: 0.3 },
        '50%': { transform: 'scale(1.4)', opacity: 0 },
        '100%': { transform: 'scale(1)', opacity: 0 },
      },
    }}
  >
    <i className='tabler-brand-whatsapp' style={{ fontSize: 32, position: 'relative', zIndex: 1 }} />
  </Box>
  )
}

export default WhatsAppButton
