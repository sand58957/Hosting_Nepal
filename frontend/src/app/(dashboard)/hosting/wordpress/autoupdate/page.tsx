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
import Switch from '@mui/material/Switch'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import Chip from '@mui/material/Chip'

import api from '@/lib/api'

interface Website {
  id: string
  domain: string
  hasWordPress: boolean
}

interface AutoUpdateSettings {
  [siteId: string]: {
    majorUpdates: boolean
    minorUpdates: boolean
    pluginUpdates: boolean
    themeUpdates: boolean
  }
}

const AutoUpdatePage = () => {
  const [websites, setWebsites] = useState<Website[]>([])
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState<AutoUpdateSettings>({})

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/hosting/websites')
        const raw = res.data?.data?.data ?? res.data?.data ?? res.data
        const sites = (Array.isArray(raw) ? raw : []).filter((w: Website) => w.hasWordPress)
        setWebsites(sites)
        const defaultSettings: AutoUpdateSettings = {}
        sites.forEach((s: Website) => {
          defaultSettings[s.id] = {
            majorUpdates: false,
            minorUpdates: true,
            pluginUpdates: true,
            themeUpdates: false,
          }
        })
        setSettings(defaultSettings)
      } catch {
        // silently handle
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const toggleSetting = (siteId: string, key: keyof AutoUpdateSettings[string]) => {
    setSettings((prev) => ({
      ...prev,
      [siteId]: {
        ...prev[siteId],
        [key]: !prev[siteId]?.[key],
      },
    }))
  }

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title='WordPress Autoupdate'
            subheader='Configure automatic updates for your WordPress installations'
          />
          <CardContent>
            {loading ? (
              <Box>
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} height={64} sx={{ mb: 1 }} />
                ))}
              </Box>
            ) : websites.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <i className='tabler-refresh-off' style={{ fontSize: 64, color: '#ccc' }} />
                <Typography variant='h6' color='text.secondary' sx={{ mt: 2 }}>
                  No WordPress sites found
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Website</TableCell>
                      <TableCell align='center'>Major Updates</TableCell>
                      <TableCell align='center'>Minor Updates</TableCell>
                      <TableCell align='center'>Plugin Updates</TableCell>
                      <TableCell align='center'>Theme Updates</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {websites.map((site) => (
                      <TableRow key={site.id} hover>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <i className='tabler-brand-wordpress' style={{ fontSize: 20, color: '#21759b' }} />
                            <Typography variant='body2' fontWeight={500}>
                              {site.domain}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align='center'>
                          <Switch
                            checked={settings[site.id]?.majorUpdates ?? false}
                            onChange={() => toggleSetting(site.id, 'majorUpdates')}
                          />
                        </TableCell>
                        <TableCell align='center'>
                          <Switch
                            checked={settings[site.id]?.minorUpdates ?? true}
                            onChange={() => toggleSetting(site.id, 'minorUpdates')}
                          />
                        </TableCell>
                        <TableCell align='center'>
                          <Switch
                            checked={settings[site.id]?.pluginUpdates ?? true}
                            onChange={() => toggleSetting(site.id, 'pluginUpdates')}
                          />
                        </TableCell>
                        <TableCell align='center'>
                          <Switch
                            checked={settings[site.id]?.themeUpdates ?? false}
                            onChange={() => toggleSetting(site.id, 'themeUpdates')}
                          />
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

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='Update History' />
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <i className='tabler-history' style={{ fontSize: 48, color: '#ccc' }} />
              <Typography variant='body1' color='text.secondary' sx={{ mt: 2 }}>
                No update history yet.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default AutoUpdatePage
