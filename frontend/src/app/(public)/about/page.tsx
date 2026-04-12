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
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'

import Logo from '@core/svg/Logo'

const values = [
  { icon: 'tabler-rocket', title: 'Innovation', desc: 'We continuously adopt cutting-edge hosting technologies — from NVMe SSD storage and LiteSpeed web servers to automated provisioning — ensuring our clients always stay ahead of the curve.' },
  { icon: 'tabler-shield-check', title: 'Reliability', desc: 'With 99.95% uptime SLA, redundant infrastructure, automated daily backups, and 24/7 monitoring, we ensure your websites and applications are always online and protected.' },
  { icon: 'tabler-heart', title: 'Customer First', desc: 'Every decision we make starts with the customer. From Nepal Rupee pricing and local payment integration to Nepali-speaking support, we build for the Nepal market first.' },
  { icon: 'tabler-lock', title: 'Security', desc: 'Enterprise-grade security is not optional — it is standard. Free SSL, DDoS protection, WAF, malware scanning, and proactive threat monitoring come with every plan.' },
  { icon: 'tabler-trending-up', title: 'Scalability', desc: 'From a single WordPress blog to enterprise infrastructure, our platform scales seamlessly. Upgrade from shared hosting to VPS to dedicated servers with zero downtime.' },
  { icon: 'tabler-users', title: 'Community', desc: 'We are committed to growing Nepal\'s digital ecosystem. Through our blog, tutorials, and local partnerships, we help businesses and developers succeed online.' },
]

const milestones = [
  { year: '2023', event: 'Company founded in Kathmandu with a mission to provide world-class hosting at Nepal-friendly prices' },
  { year: '2024', event: 'Launched WordPress Hosting, VPS, and Domain Registration services. Reached 1,000+ active customers' },
  { year: '2025', event: 'Introduced VDS and Dedicated Server hosting. Partnered with Contabo for global data center infrastructure' },
  { year: '2026', event: 'Expanded to 5,000+ customers. Launched automated provisioning, CyberPanel integration, and full NPR payment ecosystem' },
]

const teamHighlights = [
  { icon: 'tabler-code', title: 'Engineering', desc: 'Full-stack developers building automated hosting infrastructure' },
  { icon: 'tabler-headset', title: 'Support', desc: 'Nepal-based team providing 24/7 technical assistance' },
  { icon: 'tabler-chart-bar', title: 'Operations', desc: 'Infrastructure experts ensuring 99.95% uptime reliability' },
  { icon: 'tabler-bulb', title: 'Product', desc: 'Designing intuitive hosting experiences for Nepal businesses' },
]

const AboutPage = () => {
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
              <Button size='small' sx={{ color: '#fff', textTransform: 'none' }} onClick={() => router.push('/articles')}>Blog</Button>
              <Button size='small' variant='contained' sx={{ textTransform: 'none', borderRadius: 2 }} onClick={() => router.push('/register')}>Get Started</Button>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Hero */}
      <Box sx={{ py: { xs: 8, md: 12 }, textAlign: 'center', position: 'relative', overflow: 'hidden',
        '&::before': { content: '""', position: 'absolute', top: '50%', left: '50%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(115,103,240,0.08) 0%, transparent 70%)', transform: 'translate(-50%, -50%)', pointerEvents: 'none' }
      }}>
        <Container maxWidth='md'>
          <Chip label='ABOUT HOSTING NEPAL' size='small' sx={{ mb: 3, fontWeight: 700, letterSpacing: 1.5, fontSize: '0.65rem', bgcolor: 'rgba(115,103,240,0.15)', color: '#A89CF5', border: '1px solid rgba(115,103,240,0.3)' }} />
          <Typography variant='h2' fontWeight={800} sx={{ color: '#fff', mb: 3, fontSize: { xs: '1.8rem', md: '3rem' }, lineHeight: 1.2 }}>
            Powering Nepal&apos;s
            <Box component='span' sx={{ background: 'linear-gradient(135deg, #7367F0, #CE9FFC)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}> Digital Future</Box>
          </Typography>
          <Typography variant='h6' sx={{ color: 'rgba(255,255,255,0.5)', maxWidth: 650, mx: 'auto', fontWeight: 400, lineHeight: 1.7, fontSize: { xs: '0.95rem', md: '1.1rem' } }}>
            Hosting Nepal is Nepal&apos;s premier automated web hosting company, providing world-class infrastructure with local pricing, local payments, and local support. We empower businesses, startups, and developers across Nepal to build and scale their digital presence with confidence.
          </Typography>
        </Container>
      </Box>

      {/* Company Info */}
      <Container maxWidth='lg' sx={{ pb: 8 }}>
        <Grid container spacing={4}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, height: '100%' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant='overline' sx={{ color: '#7367F0', letterSpacing: 2, fontWeight: 700 }}>Who We Are</Typography>
                <Typography variant='h5' fontWeight={700} sx={{ color: '#fff', mt: 1, mb: 2.5 }}>Nepal&apos;s Top Automated Hosting Company</Typography>
                <Typography variant='body1' sx={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.9, mb: 2 }}>
                  Headquartered at <strong style={{ color: '#fff' }}>Koteshwor-32, Kathmandu</strong>, Hosting Nepal was founded with a singular vision: to make enterprise-grade web hosting accessible and affordable for every business in Nepal.
                </Typography>
                <Typography variant='body1' sx={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.9, mb: 2 }}>
                  We are owned and operated by <strong style={{ color: '#fff' }}>Marketminds Investment Group</strong>, a forward-thinking technology investment firm committed to building Nepal&apos;s digital infrastructure. Our platform is engineered and developed by <strong style={{ color: '#fff' }}>Himalayan Tech Solutions, Kathmandu</strong>, a team of experienced Nepali software engineers and DevOps professionals.
                </Typography>
                <Typography variant='body1' sx={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.9 }}>
                  From domain registration and WordPress hosting to VPS, VDS, and dedicated servers, we offer a complete ecosystem of web services — all with pricing in Nepali Rupees (NPR) and integration with local payment platforms like Khalti, eSewa, and Nepal bank transfers.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, height: '100%' }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant='overline' sx={{ color: '#28C76F', letterSpacing: 2, fontWeight: 700 }}>Our Mission</Typography>
                <Typography variant='h5' fontWeight={700} sx={{ color: '#fff', mt: 1, mb: 2.5 }}>Democratizing Web Hosting in Nepal</Typography>
                <Typography variant='body1' sx={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.9, mb: 2 }}>
                  Our mission is to eliminate the barriers that Nepal businesses face when going online. Historically, Nepali entrepreneurs have struggled with foreign hosting providers that charge in USD, lack local payment options, and provide support in distant time zones.
                </Typography>
                <Typography variant='body1' sx={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.9, mb: 2 }}>
                  Hosting Nepal changes this by providing a fully localized experience — from registration to renewal, support to scaling — entirely tailored for the Nepal market.
                </Typography>
                <Typography variant='body1' sx={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.9 }}>
                  We believe every Nepali business, regardless of size or budget, deserves fast, secure, and reliable web hosting. Whether you are a student launching your first blog, a startup building the next big platform, or an enterprise requiring dedicated infrastructure — we have the right solution for you.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* Stats */}
      <Box sx={{ py: 6, bgcolor: 'rgba(115,103,240,0.04)', borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <Container maxWidth='lg'>
          <Grid container spacing={3}>
            {[
              { value: '5,000+', label: 'Active Customers', icon: 'tabler-users' },
              { value: '10,000+', label: 'Domains Managed', icon: 'tabler-world' },
              { value: '99.95%', label: 'Uptime Guarantee', icon: 'tabler-chart-line' },
              { value: '24/7', label: 'Nepal-Based Support', icon: 'tabler-headset' },
            ].map(stat => (
              <Grid size={{ xs: 6, md: 3 }} key={stat.label}>
                <Box sx={{ textAlign: 'center' }}>
                  <i className={stat.icon} style={{ fontSize: 32, color: '#7367F0', marginBottom: 8 }} />
                  <Typography variant='h4' fontWeight={800} sx={{ color: '#fff' }}>{stat.value}</Typography>
                  <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.45)' }}>{stat.label}</Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* What We Offer */}
      <Container maxWidth='lg' sx={{ py: { xs: 6, md: 10 } }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant='h4' fontWeight={800} sx={{ color: '#fff', mb: 1 }}>What We Offer</Typography>
          <Typography variant='body1' sx={{ color: 'rgba(255,255,255,0.45)' }}>Complete web hosting ecosystem for Nepal businesses</Typography>
        </Box>
        <Grid container spacing={3}>
          {[
            { icon: 'tabler-world', title: 'Domain Registration', desc: 'Register .com, .np, .com.np and 20+ extensions. Free WHOIS privacy, instant activation, and integrated DNS management.', color: '#7367F0' },
            { icon: 'tabler-brand-wordpress', title: 'WordPress Hosting', desc: 'Managed WordPress with LiteSpeed, CyberPanel, free SSL, daily backups, and one-click staging environments.', color: '#28C76F' },
            { icon: 'tabler-server', title: 'VPS Hosting', desc: 'Full root access VPS with NVMe SSD, dedicated resources, and choice of Linux distributions. Scale CPU and RAM on demand.', color: '#00BAD1' },
            { icon: 'tabler-server-cog', title: 'VDS Hosting', desc: 'Virtual Dedicated Servers with physically dedicated CPU cores and RAM. Enterprise-grade performance without the dedicated server price.', color: '#FF9F43' },
            { icon: 'tabler-database', title: 'Dedicated Servers', desc: 'Bare metal Intel Xeon servers with full hardware control. Maximum performance for mission-critical applications and high-traffic websites.', color: '#FF4C51' },
            { icon: 'tabler-mail', title: 'Business Email', desc: 'Professional email hosting with your domain. Google Workspace, Titan Email, and custom solutions for teams of any size.', color: '#7367F0' },
          ].map(service => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={service.title}>
              <Card sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, height: '100%', transition: '0.3s', '&:hover': { borderColor: service.color, transform: 'translateY(-4px)' } }}>
                <CardContent sx={{ p: 3 }}>
                  <Avatar sx={{ width: 48, height: 48, bgcolor: `${service.color}15`, color: service.color, mb: 2 }}>
                    <i className={service.icon} style={{ fontSize: 24 }} />
                  </Avatar>
                  <Typography variant='h6' fontWeight={700} sx={{ color: '#fff', mb: 1 }}>{service.title}</Typography>
                  <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>{service.desc}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Core Values */}
      <Box sx={{ bgcolor: 'rgba(255,255,255,0.02)', py: { xs: 6, md: 10 }, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <Container maxWidth='lg'>
          <Box sx={{ textAlign: 'center', mb: 6 }}>
            <Typography variant='h4' fontWeight={800} sx={{ color: '#fff', mb: 1 }}>Our Core Values</Typography>
            <Typography variant='body1' sx={{ color: 'rgba(255,255,255,0.45)' }}>The principles that guide everything we do</Typography>
          </Box>
          <Grid container spacing={3}>
            {values.map(v => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={v.title}>
                <Box sx={{ display: 'flex', gap: 2, p: 2 }}>
                  <Avatar sx={{ width: 44, height: 44, bgcolor: 'rgba(115,103,240,0.1)', color: '#7367F0', flexShrink: 0 }}>
                    <i className={v.icon} style={{ fontSize: 22 }} />
                  </Avatar>
                  <Box>
                    <Typography variant='subtitle1' fontWeight={700} sx={{ color: '#fff', mb: 0.5 }}>{v.title}</Typography>
                    <Typography variant='body2' sx={{ color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>{v.desc}</Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Journey / Milestones */}
      <Container maxWidth='md' sx={{ py: { xs: 6, md: 10 } }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant='h4' fontWeight={800} sx={{ color: '#fff', mb: 1 }}>Our Journey</Typography>
          <Typography variant='body1' sx={{ color: 'rgba(255,255,255,0.45)' }}>From startup to Nepal&apos;s leading hosting provider</Typography>
        </Box>
        {milestones.map((m, i) => (
          <Box key={m.year} sx={{ display: 'flex', gap: 3, mb: i < milestones.length - 1 ? 4 : 0, position: 'relative',
            '&::before': i < milestones.length - 1 ? { content: '""', position: 'absolute', left: 27, top: 56, bottom: -32, width: 2, bgcolor: 'rgba(115,103,240,0.15)' } : {}
          }}>
            <Avatar sx={{ width: 56, height: 56, bgcolor: 'rgba(115,103,240,0.15)', color: '#7367F0', fontWeight: 800, fontSize: '0.85rem', flexShrink: 0 }}>
              {m.year}
            </Avatar>
            <Box sx={{ pt: 1 }}>
              <Typography variant='body1' sx={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.7 }}>{m.event}</Typography>
            </Box>
          </Box>
        ))}
      </Container>

      {/* Team */}
      <Box sx={{ bgcolor: 'rgba(255,255,255,0.02)', py: { xs: 6, md: 8 }, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <Container maxWidth='lg'>
          <Box sx={{ textAlign: 'center', mb: 5 }}>
            <Typography variant='h4' fontWeight={800} sx={{ color: '#fff', mb: 1 }}>Our Team</Typography>
            <Typography variant='body1' sx={{ color: 'rgba(255,255,255,0.45)' }}>Built by Himalayan Tech Solutions, Kathmandu</Typography>
          </Box>
          <Grid container spacing={3} justifyContent='center'>
            {teamHighlights.map(t => (
              <Grid size={{ xs: 6, md: 3 }} key={t.title}>
                <Card sx={{ bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, textAlign: 'center' }}>
                  <CardContent sx={{ py: 4 }}>
                    <Avatar sx={{ width: 56, height: 56, bgcolor: 'rgba(40,199,111,0.1)', color: '#28C76F', mx: 'auto', mb: 2 }}>
                      <i className={t.icon} style={{ fontSize: 26 }} />
                    </Avatar>
                    <Typography variant='subtitle1' fontWeight={700} sx={{ color: '#fff', mb: 0.5 }}>{t.title}</Typography>
                    <Typography variant='caption' sx={{ color: 'rgba(255,255,255,0.4)' }}>{t.desc}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* CTA */}
      <Container maxWidth='md' sx={{ py: { xs: 6, md: 10 } }}>
        <Card sx={{ bgcolor: 'rgba(115,103,240,0.06)', border: '1px solid rgba(115,103,240,0.15)', borderRadius: 4, textAlign: 'center' }}>
          <CardContent sx={{ py: 6, px: { xs: 3, md: 6 } }}>
            <Typography variant='h4' fontWeight={800} sx={{ color: '#fff', mb: 2 }}>Ready to Get Started?</Typography>
            <Typography variant='body1' sx={{ color: 'rgba(255,255,255,0.5)', mb: 4, maxWidth: 500, mx: 'auto' }}>
              Join 5,000+ Nepal businesses already powered by Hosting Nepal. Launch your website today with local pricing and local support.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button variant='contained' size='large' disableElevation onClick={() => router.push('/register')}
                sx={{ bgcolor: '#7367F0', '&:hover': { bgcolor: '#5E50EE' }, textTransform: 'none', fontWeight: 700, borderRadius: 2, px: 4 }}>
                Get Started Free
              </Button>
              <Button variant='outlined' size='large' onClick={() => router.push('/contact')}
                sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.2)', '&:hover': { borderColor: '#fff' }, textTransform: 'none', fontWeight: 600, borderRadius: 2, px: 4 }}>
                Contact Us
              </Button>
            </Box>
          </CardContent>
        </Card>
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

export default AboutPage
