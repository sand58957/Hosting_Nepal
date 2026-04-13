'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
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
import CardHeader from '@mui/material/CardHeader'

import api from '@/lib/api'
import { useAuthStore } from '@/store/auth.store'

interface DashboardStats {
  totalDomains: number
  activeHosting: number
  sslCertificates: number
  openTickets: number
}

interface Order {
  id: string
  orderNumber: string
  type: string
  description: string
  amount: number
  status: string
  createdAt: string
}

const statusColorMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
  ACTIVE: 'success',
  COMPLETED: 'success',
  PAID: 'success',
  PENDING: 'warning',
  PROCESSING: 'warning',
  EXPIRED: 'error',
  CANCELLED: 'error',
  SUSPENDED: 'error',
  FAILED: 'error',
}

const DashboardPage = () => {
  const router = useRouter()
  const { user } = useAuthStore()
  const [stats, setStats] = useState<DashboardStats>({
    totalDomains: 0,
    activeHosting: 0,
    sslCertificates: 0,
    openTickets: 0,
  })
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [domainsRes, sslRes, supportRes, hostingRes, ordersRes] = await Promise.allSettled([
          api.get('/domains/dashboard'),
          api.get('/ssl'),
          api.get('/support'),
          api.get('/hosting/websites'),
          api.get('/billing/orders'),
        ])

        let totalDomains = 0
        let activeHosting = 0
        let sslCertificates = 0
        let openTickets = 0

        if (domainsRes.status === 'fulfilled') {
          const raw = domainsRes.value.data?.data?.data ?? domainsRes.value.data?.data ?? domainsRes.value.data
          totalDomains = raw?.totalDomains ?? raw?.activeDomains ?? 0
        }

        if (sslRes.status === 'fulfilled') {
          const raw = sslRes.value.data?.data?.data ?? sslRes.value.data?.data ?? sslRes.value.data
          sslCertificates = Array.isArray(raw) ? raw.length : (raw?.total ?? raw?.certificates?.length ?? 0)
        }

        if (supportRes.status === 'fulfilled') {
          const raw = supportRes.value.data?.data?.data ?? supportRes.value.data?.data ?? supportRes.value.data
          const tickets: Array<{ status: string }> = Array.isArray(raw) ? raw : (raw?.tickets ?? [])
          openTickets = tickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS' || t.status === 'REOPENED').length
        }

        if (hostingRes.status === 'fulfilled') {
          const raw = hostingRes.value.data?.data?.data ?? hostingRes.value.data?.data ?? hostingRes.value.data
          const sites: Array<{ status: string }> = Array.isArray(raw) ? raw : (raw?.websites ?? raw?.data ?? [])
          activeHosting = sites.filter(s => s.status === 'ACTIVE').length
        }

        setStats({ totalDomains, activeHosting, sslCertificates, openTickets })

        if (ordersRes.status === 'fulfilled') {
          const data = ordersRes.value.data?.data ?? ordersRes.value.data
          setOrders(Array.isArray(data?.orders) ? data.orders.slice(0, 5) : Array.isArray(data) ? data.slice(0, 5) : [])
        }
      } catch {
        // silently handle
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const statCards = [
    { label: 'Total Domains', value: stats.totalDomains, icon: 'tabler-world', color: 'primary.main' },
    { label: 'Active Hosting', value: stats.activeHosting, icon: 'tabler-server', color: 'success.main' },
    { label: 'SSL Certificates', value: stats.sslCertificates, icon: 'tabler-lock', color: 'info.main' },
    { label: 'Open Tickets', value: stats.openTickets, icon: 'tabler-help-circle', color: 'warning.main' },
  ]

  return (
    <Grid container spacing={6}>
      {/* Welcome Card */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 4 }}>
            <Box>
              <Typography variant='h4' sx={{ mb: 1 }}>
                Welcome back, {user?.name || 'User'}!
              </Typography>
              <Typography variant='body1' color='text.secondary'>
                Manage your hosting services, domains, and more from your dashboard.
              </Typography>
            </Box>
            <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56, display: { xs: 'none', sm: 'flex' } }}>
              <i className='tabler-layout-dashboard' style={{ fontSize: 28 }} />
            </Avatar>
          </CardContent>
        </Card>
      </Grid>

      {/* Stat Cards */}
      {statCards.map((stat) => (
        <Grid size={{ xs: 12, sm: 6, md: 3 }} key={stat.label}>
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
            <Button variant='contained' startIcon={<i className='tabler-world' />} onClick={() => router.push('/domains')}>
              Register Domain
            </Button>
            <Button variant='contained' color='success' startIcon={<i className='tabler-server' />} onClick={() => router.push('/hosting')}>
              Buy Hosting
            </Button>
            <Button variant='contained' color='info' startIcon={<i className='tabler-cloud' />} onClick={() => router.push('/vps')}>
              Create VPS
            </Button>
          </CardContent>
        </Card>
      </Grid>

      {/* Recent Orders */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='Recent Orders' />
          <CardContent>
            {loading ? (
              <Box>
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} height={50} sx={{ mb: 1 }} />
                ))}
              </Box>
            ) : orders.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <i className='tabler-receipt-off' style={{ fontSize: 48, color: '#aaa' }} />
                <Typography variant='body1' color='text.secondary' sx={{ mt: 2 }}>
                  No orders yet. Get started by registering a domain or buying hosting.
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Order #</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>{order.orderNumber || order.id}</TableCell>
                        <TableCell>{order.type}</TableCell>
                        <TableCell>{order.description}</TableCell>
                        <TableCell>NPR {order.amount?.toLocaleString()}</TableCell>
                        <TableCell>
                          <Chip
                            label={order.status}
                            size='small'
                            color={statusColorMap[order.status] || 'default'}
                          />
                        </TableCell>
                        <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
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

export default DashboardPage
