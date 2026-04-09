'use client'

import { useState, useEffect } from 'react'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Box from '@mui/material/Box'
import Avatar from '@mui/material/Avatar'
import Switch from '@mui/material/Switch'
import CircularProgress from '@mui/material/CircularProgress'
import Skeleton from '@mui/material/Skeleton'

import api from '@/lib/api'

interface ParkingDomain {
  id: string
  name: string
  parkingEnabled: boolean
  revenue: number
  visitors: number
  clicks: number
}

interface ParkingStats {
  totalRevenue: number
  totalVisitors: number
  totalClicks: number
  activeParkingDomains: number
}

const ParkingPage = () => {
  const [domains, setDomains] = useState<ParkingDomain[]>([])
  const [stats, setStats] = useState<ParkingStats>({
    totalRevenue: 0,
    totalVisitors: 0,
    totalClicks: 0,
    activeParkingDomains: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/domains/investor/parking')
        const raw = res.data?.data?.data ?? res.data?.data ?? res.data
        setDomains(Array.isArray(raw?.domains) ? raw.domains : Array.isArray(raw) ? raw : [])
        setStats({
          totalRevenue: raw?.totalRevenue ?? 0,
          totalVisitors: raw?.totalVisitors ?? 0,
          totalClicks: raw?.totalClicks ?? 0,
          activeParkingDomains: raw?.activeParkingDomains ?? 0,
        })
      } catch {
        // silently handle
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleToggleParking = async (domain: ParkingDomain) => {
    try {
      await api.put(`/domains/investor/parking/${domain.id}`, {
        parkingEnabled: !domain.parkingEnabled,
      })

      setDomains((prev) =>
        prev.map((d) => (d.id === domain.id ? { ...d, parkingEnabled: !d.parkingEnabled } : d))
      )
    } catch {
      // silently handle
    }
  }

  const statCards = [
    { label: 'Total Revenue', value: `NPR ${stats.totalRevenue.toLocaleString()}`, icon: 'tabler-currency-rupee-nepalese', color: 'success.main' },
    { label: 'Total Visitors', value: stats.totalVisitors.toLocaleString(), icon: 'tabler-users', color: 'primary.main' },
    { label: 'Total Clicks', value: stats.totalClicks.toLocaleString(), icon: 'tabler-click', color: 'info.main' },
    { label: 'Parked Domains', value: stats.activeParkingDomains, icon: 'tabler-parking', color: 'warning.main' },
  ]

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Box>
            <Typography variant='h4'>Domain Parking</Typography>
            <Typography variant='body2' color='text.secondary'>
              Earn revenue from parked domains
            </Typography>
          </Box>
        </Box>
      </Grid>

      {/* Stats */}
      {statCards.map((stat) => (
        <Grid size={{ xs: 12, sm: 6, md: 3 }} key={stat.label}>
          <Card>
            <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                {loading ? (
                  <Skeleton width={60} height={40} />
                ) : (
                  <Typography variant='h5'>{stat.value}</Typography>
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

      {/* Domains Table */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='Parked Domains' />
          <CardContent>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : domains.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <i className='tabler-parking' style={{ fontSize: 48, color: '#ccc' }} />
                <Typography variant='body1' color='text.secondary' sx={{ mt: 2 }}>
                  No domains available for parking
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Domain</TableCell>
                      <TableCell>Parking</TableCell>
                      <TableCell>Revenue (NPR)</TableCell>
                      <TableCell>Visitors</TableCell>
                      <TableCell>Clicks</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {domains.map((domain) => (
                      <TableRow key={domain.id}>
                        <TableCell>
                          <Typography variant='body2' fontWeight={500}>{domain.name}</Typography>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={domain.parkingEnabled}
                            size='small'
                            onChange={() => handleToggleParking(domain)}
                          />
                        </TableCell>
                        <TableCell>{domain.revenue?.toLocaleString()}</TableCell>
                        <TableCell>{domain.visitors?.toLocaleString()}</TableCell>
                        <TableCell>{domain.clicks?.toLocaleString()}</TableCell>
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

export default ParkingPage
