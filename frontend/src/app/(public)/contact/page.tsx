'use client'

import { useRouter } from 'next/navigation'

import Container from '@mui/material/Container'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Grid from '@mui/material/Grid'
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Avatar from '@mui/material/Avatar'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'

import Logo from '@core/svg/Logo'

const ContactPage = () => {
  const router = useRouter()

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#0f0f1a' }}>
      {/* Header */}
      <Box sx={{ bgcolor: 'rgba(15,15,26,0.95)', borderBottom: '1px solid rgba(255,255,255,0.06)', py: 1.5 }}>
        <Container maxWidth='lg'>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }} onClick={() => router.push('/home')}>
              <Logo />
              <Typography variant='h6' fontWeight={800} sx={{ color: '#fff', display: { xs: 'none', sm: 'block' } }}>Hosting Nepal</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1.5 } }}>
              <Button size='small' sx={{ color: '#fff', textTransform: 'none' }} onClick={() => router.push('/home')}>Home</Button>
              <Button size='small' sx={{ color: '#fff', textTransform: 'none' }} onClick={() => router.push('/about')}>About</Button>
              <Button size='small' variant='contained' sx={{ textTransform: 'none', borderRadius: 2 }} onClick={() => router.push('/register')}>Get Started</Button>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Hero */}
      <Box sx={{ py: { xs: 6, md: 10 }, textAlign: 'center' }}>
        <Container maxWidth='md'>
          <Chip label='CONTACT US' size='small' sx={{ mb: 3, fontWeight: 700, letterSpacing: 1.5, fontSize: '0.65rem', bgcolor: 'rgba(40,199,111,0.15)', color: '#28C76F', border: '1px solid rgba(40,199,111,0.3)' }} />
          <Typography variant='h3' fontWeight={800} sx={{ color: '#fff', mb: 2, fontSize: { xs: '1.8rem', md: '2.5rem' } }}>Get in Touch</Typography>
          <Typography variant='body1' sx={{ color: 'rgba(255,255,255,0.5)', maxWidth: 550, mx: 'auto' }}>
            Have questions about our hosting services? Our Nepal-based team is here to help you 24/7. Reach out through any of the channels below.
          </Typography>
        </Container>
      </Box>

      {/* Contact Cards */}
      <Container maxWidth='lg' sx={{ pb: 8 }}>
        <Grid container spacing={3}>
          {/* Email */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, height: '100%', transition: '0.3s', '&:hover': { borderColor: '#7367F0', transform: 'translateY(-4px)' } }}>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <Avatar sx={{ width: 64, height: 64, bgcolor: 'rgba(115,103,240,0.1)', color: '#7367F0', mx: 'auto', mb: 3 }}>
                  <i className='tabler-mail' style={{ fontSize: 30 }} />
                </Avatar>
                <Typography variant='h6' fontWeight={700} sx={{ color: '#fff', mb: 2 }}>Email Us</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box>
                    <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.35)', display: 'block', mb: 0.3 }}>General Inquiries</Typography>
                    <Typography variant='body2' component='a' href='mailto:admin@hostingnepals.com' sx={{ color: '#7367F0', textDecoration: 'none', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}>
                      admin@hostingnepals.com
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.35)', display: 'block', mb: 0.3 }}>Corporate Office</Typography>
                    <Typography variant='body2' component='a' href='mailto:admin@nepalfillings.com' sx={{ color: '#7367F0', textDecoration: 'none', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}>
                      admin@nepalfillings.com
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.35)', display: 'block', mb: 0.3 }}>Business Partners</Typography>
                    <Typography variant='body2' component='a' href='mailto:admin@nepsetrading.com' sx={{ color: '#7367F0', textDecoration: 'none', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}>
                      admin@nepsetrading.com
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Phone */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, height: '100%', transition: '0.3s', '&:hover': { borderColor: '#28C76F', transform: 'translateY(-4px)' } }}>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <Avatar sx={{ width: 64, height: 64, bgcolor: 'rgba(40,199,111,0.1)', color: '#28C76F', mx: 'auto', mb: 3 }}>
                  <i className='tabler-phone' style={{ fontSize: 30 }} />
                </Avatar>
                <Typography variant='h6' fontWeight={700} sx={{ color: '#fff', mb: 2 }}>Call Us</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box>
                    <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.35)', display: 'block', mb: 0.3 }}>Sales & Support</Typography>
                    <Typography variant='body2' component='a' href='tel:+9779802348957' sx={{ color: '#28C76F', textDecoration: 'none', fontWeight: 600 }}>+977-9802348957</Typography>
                    <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.3)' }}> / </Typography>
                    <Typography variant='body2' component='a' href='tel:+9779709066517' sx={{ color: '#28C76F', textDecoration: 'none', fontWeight: 600 }}>9709066517</Typography>
                  </Box>
                  <Box>
                    <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.35)', display: 'block', mb: 0.3 }}>Technical Support</Typography>
                    <Typography variant='body2' component='a' href='tel:+9779709066745' sx={{ color: '#28C76F', textDecoration: 'none', fontWeight: 600 }}>+977-9709066745</Typography>
                    <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.3)' }}> / </Typography>
                    <Typography variant='body2' component='a' href='tel:+9779708072951' sx={{ color: '#28C76F', textDecoration: 'none', fontWeight: 600 }}>9708072951</Typography>
                  </Box>
                  <Box>
                    <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.35)', display: 'block', mb: 0.3 }}>Office Landline</Typography>
                    <Typography variant='body2' component='a' href='tel:+9779802363869' sx={{ color: '#28C76F', textDecoration: 'none', fontWeight: 600 }}>+977-9802363869</Typography>
                    <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.3)' }}> / </Typography>
                    <Typography variant='body2' component='a' href='tel:+97715253221' sx={{ color: '#28C76F', textDecoration: 'none', fontWeight: 600 }}>01-5253221</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Location */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Card sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, height: '100%', transition: '0.3s', '&:hover': { borderColor: '#FF9F43', transform: 'translateY(-4px)' } }}>
              <CardContent sx={{ p: 4, textAlign: 'center' }}>
                <Avatar sx={{ width: 64, height: 64, bgcolor: 'rgba(255,159,67,0.1)', color: '#FF9F43', mx: 'auto', mb: 3 }}>
                  <i className='tabler-map-pin' style={{ fontSize: 30 }} />
                </Avatar>
                <Typography variant='h6' fontWeight={700} sx={{ color: '#fff', mb: 2 }}>Visit Us</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Box>
                    <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.35)', display: 'block', mb: 0.3 }}>Head Office</Typography>
                    <Typography variant='body2' sx={{ color: '#fff', fontWeight: 600 }}>Koteshwor, Kathmandu, Nepal</Typography>
                    <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.4)' }}>Near Rastriya Banijya Bank, Koteshwor</Typography>
                  </Box>
                  <Box>
                    <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.35)', display: 'block', mb: 0.3 }}>Office Hours</Typography>
                    <Typography variant='body2' sx={{ color: '#fff', fontWeight: 500 }}>Sun - Fri: 10:00 AM - 6:00 PM</Typography>
                    <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.4)' }}>Saturday: Closed</Typography>
                  </Box>
                  <Box>
                    <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.35)', display: 'block', mb: 0.3 }}>Online Support</Typography>
                    <Typography variant='body2' sx={{ color: '#FF9F43', fontWeight: 600 }}>24/7 via Support Tickets</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Quick Links */}
        <Box sx={{ mt: 6 }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3 }}>
                <CardContent sx={{ p: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Avatar sx={{ width: 56, height: 56, bgcolor: 'rgba(0,207,232,0.1)', color: '#00CFE8' }}>
                    <i className='tabler-headset' style={{ fontSize: 28 }} />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant='h6' fontWeight={700} sx={{ color: '#fff', mb: 0.5 }}>Support Center</Typography>
                    <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.45)', mb: 1.5 }}>
                      Create a support ticket from your dashboard for fastest response. Our team responds within 15 minutes on average.
                    </Typography>
                    <Button variant='outlined' size='small' onClick={() => router.push('/support')}
                      sx={{ color: '#00CFE8', borderColor: 'rgba(0,207,232,0.3)', textTransform: 'none', fontWeight: 600, borderRadius: 2, '&:hover': { borderColor: '#00CFE8' } }}>
                      Open Support Center
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3 }}>
                <CardContent sx={{ p: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Avatar sx={{ width: 56, height: 56, bgcolor: 'rgba(115,103,240,0.1)', color: '#7367F0' }}>
                    <i className='tabler-article' style={{ fontSize: 28 }} />
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant='h6' fontWeight={700} sx={{ color: '#fff', mb: 0.5 }}>Blog & Resources</Typography>
                    <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.45)', mb: 1.5 }}>
                      Read our latest guides on hosting, domains, SEO, and web development tailored for Nepal businesses.
                    </Typography>
                    <Button variant='outlined' size='small' onClick={() => router.push('/articles')}
                      sx={{ color: '#7367F0', borderColor: 'rgba(115,103,240,0.3)', textTransform: 'none', fontWeight: 600, borderRadius: 2, '&:hover': { borderColor: '#7367F0' } }}>
                      Visit Blog
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Container>

      {/* Footer */}
      <Box sx={{ bgcolor: '#131325', py: 4, textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.3)' }}>
          {new Date().getFullYear()} &copy; Marketminds Investment Group. All rights reserved.
        </Typography>
      </Box>
    </Box>
  )
}

export default ContactPage
