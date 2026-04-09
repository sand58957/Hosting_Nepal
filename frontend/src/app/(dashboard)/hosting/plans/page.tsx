'use client'

import { useState, useEffect } from 'react'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import Tab from '@mui/material/Tab'
import Tabs from '@mui/material/Tabs'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Avatar from '@mui/material/Avatar'
import Alert from '@mui/material/Alert'

import api from '@/lib/api'

interface HostingPlan {
  id: string
  name: string
  type: string
  priceMonthly: number
  priceYearly: number
  currency: string
  features: string[]
  popular?: boolean
  specs: {
    diskGB: number
    bandwidthGB: number
    emailAccounts: number
    subdomains: number
    databases: number
    cpuCores?: number
    ramGB?: number
  }
}

const tabTypes = ['WORDPRESS']
const tabLabels = ['WordPress Hosting']

const PlansPage = () => {
  const [currentTab, setCurrentTab] = useState(0)
  const [plans, setPlans] = useState<HostingPlan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/hosting/plans')
        const raw = res.data?.data?.data ?? res.data?.data ?? res.data
        const allPlans = Array.isArray(raw?.plans) ? raw.plans : Array.isArray(raw) ? raw : []
        setPlans(allPlans)
      } catch {
        // silently handle
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const filteredPlans = plans.filter((p) => p.type === tabTypes[currentTab])

  return (
    <Grid container spacing={6}>
      {/* Current Plan */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='Your Current Plan' />
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                <i className='tabler-server' style={{ fontSize: 28, color: '#fff' }} />
              </Avatar>
              <Box>
                <Typography variant='h6'>No active plan</Typography>
                <Typography variant='body2' color='text.secondary'>
                  Choose a hosting plan below to get started
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Available Plans */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='Available Plans' subheader='Choose the perfect hosting plan for your needs' />
          <CardContent>
            <Tabs value={currentTab} onChange={(_, v) => setCurrentTab(v)} sx={{ mb: 4 }}>
              {tabLabels.map((label) => (
                <Tab key={label} label={label} />
              ))}
            </Tabs>

            {loading ? (
              <Grid container spacing={4}>
                {[...Array(3)].map((_, i) => (
                  <Grid size={{ xs: 12, sm: 6, md: 4 }} key={i}>
                    <Skeleton variant='rectangular' height={350} sx={{ borderRadius: 1 }} />
                  </Grid>
                ))}
              </Grid>
            ) : filteredPlans.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <i className='tabler-server-off' style={{ fontSize: 48, color: '#ccc' }} />
                <Typography variant='body1' color='text.secondary' sx={{ mt: 2 }}>
                  No plans available in this category yet.
                </Typography>
              </Box>
            ) : (
              <Grid container spacing={4}>
                {filteredPlans.map((plan) => {
                  // Contabo VPS infrastructure specs per plan tier
                  const infraSpecs: Record<string, { cpu: number; ram: number; nvme: number; bandwidth: string }> = {
                    'wp-starter': { cpu: 4, ram: 8, nvme: 75, bandwidth: '200 Mbit/s' },
                    'wp-essential': { cpu: 4, ram: 8, nvme: 75, bandwidth: '200 Mbit/s' },
                    'wp-business': { cpu: 6, ram: 12, nvme: 100, bandwidth: '300 Mbit/s' },
                    'wp-developer': { cpu: 6, ram: 12, nvme: 100, bandwidth: '300 Mbit/s' },
                    'wp-starter-plus': { cpu: 8, ram: 24, nvme: 200, bandwidth: '600 Mbit/s' },
                    'wp-grow-big': { cpu: 8, ram: 24, nvme: 200, bandwidth: '600 Mbit/s' },
                    'wp-go-geek': { cpu: 12, ram: 48, nvme: 250, bandwidth: '800 Mbit/s' },
                    'wp-enterprise': { cpu: 16, ram: 64, nvme: 300, bandwidth: '1 Gbit/s' },
                  }
                  const infra = infraSpecs[plan.id] || { cpu: plan.specs?.cpuCores || 4, ram: plan.specs?.ramGB || 8, nvme: plan.specs?.diskGB || 75, bandwidth: '200 Mbit/s' }

                  return (
                    <Grid size={{ xs: 12, sm: 6, md: 3 }} key={plan.id}>
                      <Card
                        variant='outlined'
                        sx={{
                          position: 'relative',
                          borderColor: plan.popular ? 'primary.main' : 'divider',
                          borderWidth: plan.popular ? 2 : 1,
                          overflow: 'visible',
                        }}
                      >
                        {plan.popular && (
                          <Chip
                            label='Most Popular'
                            color='primary'
                            size='small'
                            sx={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', zIndex: 1 }}
                          />
                        )}
                        <CardContent sx={{ p: 0 }}>
                          {/* Header */}
                          <Box sx={{
                            bgcolor: plan.popular ? 'primary.main' : 'action.hover',
                            color: plan.popular ? 'white' : 'text.primary',
                            textAlign: 'center',
                            py: 3,
                            px: 2,
                          }}>
                            <i className='tabler-brand-wordpress' style={{ fontSize: 32, marginBottom: 4 }} />
                            <Typography variant='h5' fontWeight={700} color='inherit'>{plan.name}</Typography>
                            <Typography variant='h4' fontWeight={800} color='inherit' sx={{ mt: 1 }}>
                              NPR {plan.priceMonthly?.toLocaleString()}
                              <Typography component='span' variant='body2' color='inherit' sx={{ opacity: 0.8 }}>/mo</Typography>
                            </Typography>
                          </Box>

                          {/* Plan Features */}
                          <Box>
                            {plan.features.map((feature, idx) => (
                              <Box
                                key={idx}
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  py: 1.2,
                                  borderBottom: idx < plan.features.length - 1 ? '1px solid' : 'none',
                                  borderColor: 'divider',
                                }}
                              >
                                <Typography variant='body2'>
                                  <i className='tabler-check' style={{ fontSize: 14, marginRight: 4, color: '#4caf50' }} />
                                  {feature}
                                </Typography>
                              </Box>
                            ))}
                          </Box>

                          {/* Infrastructure Specs */}
                          <Box sx={{ bgcolor: 'action.hover', px: 2, py: 1.5 }}>
                            <Typography variant='caption' color='text.secondary' fontWeight={600} sx={{ display: 'block', textAlign: 'center', mb: 0.5 }}>
                              Server Infrastructure
                            </Typography>
                            <Typography variant='caption' color='text.secondary' sx={{ display: 'block', textAlign: 'center' }}>
                              {infra.cpu} vCPU &bull; {infra.ram} GB RAM &bull; {infra.nvme} GB NVMe &bull; {infra.bandwidth}
                            </Typography>
                          </Box>

                          {/* Button */}
                          <Box sx={{ p: 2 }}>
                            <Button variant={plan.popular ? 'contained' : 'outlined'} fullWidth size='large' href='/hosting/add'>
                              Get Started
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  )
                })}
              </Grid>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default PlansPage
