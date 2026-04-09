'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Avatar from '@mui/material/Avatar'
import Skeleton from '@mui/material/Skeleton'
import CircularProgress from '@mui/material/CircularProgress'

import api from '@/lib/api'

interface DashboardData {
  totalDomains: number
  activeDomains: number
  expiringSoon: number
  expiredDomains: number
  recentlyRegistered: number
  totalTlds: number
  upcomingRenewals: Array<{
    id: string
    name: string
    expiryDate: string
    status: string
    autoRenew: boolean
  }>
}

const statusColorMap: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  ACTIVE: 'success',
  EXPIRING: 'warning',
  EXPIRED: 'error',
}

const DomainDashboardPage = () => {
  const router = useRouter()
  const [data, setData] = useState<DashboardData>({
    totalDomains: 0,
    activeDomains: 0,
    expiringSoon: 0,
    expiredDomains: 0,
    recentlyRegistered: 0,
    totalTlds: 0,
    upcomingRenewals: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/domains/dashboard')
        const raw = res.data?.data?.data ?? res.data?.data ?? res.data
        setData({
          totalDomains: raw?.totalDomains ?? 0,
          activeDomains: raw?.activeDomains ?? 0,
          expiringSoon: raw?.expiringSoon ?? 0,
          expiredDomains: raw?.expiredDomains ?? 0,
          recentlyRegistered: raw?.recentlyRegistered ?? 0,
          totalTlds: raw?.totalTlds ?? 0,
          upcomingRenewals: Array.isArray(raw?.upcomingRenewals) ? raw.upcomingRenewals : [],
        })
      } catch {
        // silently handle
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const statCards = [
    { label: 'Total Domains', value: data.totalDomains, icon: 'tabler-world', color: 'primary.main' },
    { label: 'Active', value: data.activeDomains, icon: 'tabler-circle-check', color: 'success.main' },
    { label: 'Expiring Soon', value: data.expiringSoon, icon: 'tabler-clock-exclamation', color: 'warning.main' },
    { label: 'Expired', value: data.expiredDomains, icon: 'tabler-circle-x', color: 'error.main' },
    { label: 'Recently Registered', value: data.recentlyRegistered, icon: 'tabler-sparkles', color: 'info.main' },
    { label: 'Total TLDs', value: data.totalTlds, icon: 'tabler-tags', color: 'secondary.main' },
  ]

  return (
    <Grid container spacing={6}>
      {/* Page Header */}
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant='h4'>Domain Dashboard</Typography>
            <Typography variant='body2' color='text.secondary'>
              Overview of all your domain assets
            </Typography>
          </Box>
        </Box>
      </Grid>

      {/* Stat Cards - 2x3 grid */}
      {statCards.map((stat) => (
        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={stat.label}>
          <Card>
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                {loading ? (
                  <Skeleton width={40} height={40} />
                ) : (
                  <Typography variant='h4'>{stat.value}</Typography>
                )}
                <Typography variant='body2' color='text.secondary'>
                  {stat.label}
                </Typography>
              </Box>
              <Avatar sx={{ bgcolor: stat.color, width: 42, height: 42 }}>
                <i className={stat.icon} style={{ fontSize: 24, color: '#fff' }} />
              </Avatar>
            </CardContent>
          </Card>
        </Grid>
      ))}

      {/* Quick Actions */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='Quick Actions' />
          <CardContent sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant='contained'
              startIcon={<i className='tabler-search' />}
              onClick={() => router.push('/domains/search')}
            >
              Register Domain
            </Button>
            <Button
              variant='contained'
              color='info'
              startIcon={<i className='tabler-transfer' />}
              onClick={() => router.push('/domains/transfers')}
            >
              Transfer Domain
            </Button>
            <Button
              variant='contained'
              color='secondary'
              startIcon={<i className='tabler-list' />}
              onClick={() => router.push('/domains/portfolio')}
            >
              View Portfolio
            </Button>
          </CardContent>
        </Card>
      </Grid>

      {/* Upcoming Renewals */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='Upcoming Renewals' />
          <CardContent>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : data.upcomingRenewals.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <i className='tabler-calendar-check' style={{ fontSize: 48, color: '#ccc' }} />
                <Typography variant='body1' color='text.secondary' sx={{ mt: 2 }}>
                  No upcoming renewals
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Domain Name</TableCell>
                      <TableCell>Expiry Date</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Auto-Renew</TableCell>
                      <TableCell>Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.upcomingRenewals.map((domain) => (
                      <TableRow key={domain.id}>
                        <TableCell>
                          <Typography variant='body2' fontWeight={500}>
                            {domain.name}
                          </Typography>
                        </TableCell>
                        <TableCell>{new Date(domain.expiryDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Chip
                            label={domain.status}
                            size='small'
                            color={statusColorMap[domain.status] || 'default'}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={domain.autoRenew ? 'On' : 'Off'}
                            size='small'
                            color={domain.autoRenew ? 'success' : 'default'}
                            variant='outlined'
                          />
                        </TableCell>
                        <TableCell>
                          <Button size='small' variant='outlined'>
                            Renew Now
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default DomainDashboardPage
