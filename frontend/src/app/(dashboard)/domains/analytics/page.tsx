'use client'

import { useState, useEffect } from 'react'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Avatar from '@mui/material/Avatar'
import CircularProgress from '@mui/material/CircularProgress'
import Skeleton from '@mui/material/Skeleton'
import LinearProgress from '@mui/material/LinearProgress'

import api from '@/lib/api'

interface AnalyticsData {
  registrationTrend: Array<{ month: string; count: number }>
  tldDistribution: Array<{ tld: string; count: number; percentage: number }>
  statusBreakdown: Array<{ status: string; count: number }>
  totalSpend: number
  totalDomains: number
  avgCostPerDomain: number
}

const statusColorMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  ACTIVE: 'success',
  EXPIRING: 'warning',
  EXPIRED: 'error',
  PENDING: 'info',
}

const barColors = ['#7C4DFF', '#00BFA5', '#FF6D00', '#2979FF', '#F50057', '#00C853', '#AA00FF', '#FFD600', '#304FFE', '#D50000', '#00B8D4', '#64DD17']

const AnalyticsPage = () => {
  const [data, setData] = useState<AnalyticsData>({
    registrationTrend: [],
    tldDistribution: [],
    statusBreakdown: [],
    totalSpend: 0,
    totalDomains: 0,
    avgCostPerDomain: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/domains/analytics')
        const raw = res.data?.data?.data ?? res.data?.data ?? res.data
        setData({
          registrationTrend: Array.isArray(raw?.registrationTrend) ? raw.registrationTrend : [],
          tldDistribution: Array.isArray(raw?.tldDistribution) ? raw.tldDistribution : [],
          statusBreakdown: Array.isArray(raw?.statusBreakdown) ? raw.statusBreakdown : [],
          totalSpend: raw?.totalSpend ?? 0,
          totalDomains: raw?.totalDomains ?? 0,
          avgCostPerDomain: raw?.avgCostPerDomain ?? 0,
        })
      } catch {
        // silently handle
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const maxTrendCount = Math.max(...data.registrationTrend.map((t) => t.count), 1)

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant='h4'>Domain Analytics</Typography>
            <Typography variant='body2' color='text.secondary'>
              Insights and statistics about your domain portfolio
            </Typography>
          </Box>
        </Box>
      </Grid>

      {/* Summary Stats */}
      {[
        { label: 'Total Domains', value: data.totalDomains, icon: 'tabler-world', color: 'primary.main' },
        { label: 'Total Spend', value: `NPR ${data.totalSpend.toLocaleString()}`, icon: 'tabler-currency-rupee-nepalese', color: 'success.main' },
        { label: 'Avg Cost/Domain', value: `NPR ${data.avgCostPerDomain.toLocaleString()}`, icon: 'tabler-chart-line', color: 'info.main' },
      ].map((stat) => (
        <Grid size={{ xs: 12, sm: 4 }} key={stat.label}>
          <Card>
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                {loading ? (
                  <Skeleton width={80} height={40} />
                ) : (
                  <Typography variant='h5'>{stat.value}</Typography>
                )}
                <Typography variant='body2' color='text.secondary'>{stat.label}</Typography>
              </Box>
              <Avatar sx={{ bgcolor: stat.color, width: 42, height: 42 }}>
                <i className={stat.icon} style={{ fontSize: 24, color: '#fff' }} />
              </Avatar>
            </CardContent>
          </Card>
        </Grid>
      ))}

      {/* Registration Trend (Bar Chart with MUI Box) */}
      <Grid size={{ xs: 12, md: 8 }}>
        <Card>
          <CardHeader title='Registration Trend (12 Months)' />
          <CardContent>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : data.registrationTrend.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography variant='body2' color='text.secondary'>No registration data available</Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 200 }}>
                {data.registrationTrend.map((item, idx) => (
                  <Box key={idx} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Typography variant='caption' sx={{ mb: 0.5 }}>{item.count}</Typography>
                    <Box
                      sx={{
                        width: '100%',
                        maxWidth: 40,
                        height: `${(item.count / maxTrendCount) * 160}px`,
                        minHeight: 4,
                        bgcolor: barColors[idx % barColors.length],
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.3s',
                      }}
                    />
                    <Typography variant='caption' color='text.secondary' sx={{ mt: 0.5, fontSize: 10 }}>
                      {item.month}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Status Breakdown */}
      <Grid size={{ xs: 12, md: 4 }}>
        <Card>
          <CardHeader title='Status Breakdown' />
          <CardContent>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : data.statusBreakdown.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant='body2' color='text.secondary'>No data</Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {data.statusBreakdown.map((item) => (
                  <Box key={item.status} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Chip
                      label={item.status}
                      size='small'
                      color={statusColorMap[item.status] || 'default'}
                      sx={{ minWidth: 80 }}
                    />
                    <Typography variant='h6'>{item.count}</Typography>
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* TLD Distribution */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='TLD Distribution' />
          <CardContent>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : data.tldDistribution.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant='body2' color='text.secondary'>No TLD data available</Typography>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {data.tldDistribution.map((item, idx) => (
                  <Box key={item.tld}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant='body2' fontWeight={500}>.{item.tld}</Typography>
                      <Typography variant='body2' color='text.secondary'>
                        {item.count} ({item.percentage}%)
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant='determinate'
                      value={item.percentage}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: 'action.hover',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: barColors[idx % barColors.length],
                          borderRadius: 4,
                        },
                      }}
                    />
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default AnalyticsPage
