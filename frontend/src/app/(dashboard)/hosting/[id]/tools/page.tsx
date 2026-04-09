'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import LinearProgress from '@mui/material/LinearProgress'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Breadcrumbs from '@mui/material/Breadcrumbs'
import Link from '@mui/material/Link'

import api from '@/lib/api'

interface SiteInfo {
  id: string
  domain: string
  ipAddress: string
  nameservers: string[]
  phpVersion: string
  diskQuotaMb: number
  bandwidthQuotaMb: number
  cpanelUsername: string
  status: string
  planName: string
  planType: string
}

interface SiteStats {
  diskSpaceMb: number
  diskUsedMb: number
  bandwidthMb: number
  bandwidthUsedMb: number
  status: string
}

interface ToolItem {
  icon: string
  label: string
  href: string
  color?: string
}

const toolSections: { title: string; tools: ToolItem[] }[] = [
  {
    title: 'Files & Databases',
    tools: [
      { icon: 'tabler-folder', label: 'File Manager', href: '/hosting/tools/file-manager' },
      { icon: 'tabler-file-upload', label: 'FTP Accounts', href: '/hosting/tools/ftp' },
      { icon: 'tabler-database', label: 'MySQL Manager', href: '/hosting/tools/mysql' },
      { icon: 'tabler-database-cog', label: 'PostgreSQL', href: '#', color: '#999' },
      { icon: 'tabler-archive', label: 'Backups', href: '/hosting/tools/backups' },
      { icon: 'tabler-lock', label: 'SSL Manager', href: '/hosting/tools/ssl' },
    ],
  },
  {
    title: 'Security',
    tools: [
      { icon: 'tabler-shield-lock', label: 'HTTPS Enforce', href: '/hosting/security/https' },
      { icon: 'tabler-lock-access', label: 'Protected URLs', href: '/hosting/security/protected-urls' },
      { icon: 'tabler-ban', label: 'Blocked Traffic', href: '/hosting/security/blocked-traffic' },
      { icon: 'tabler-scan', label: 'Site Scanner', href: '/hosting/security/scanner' },
      { icon: 'tabler-rocket', label: 'SuperCacher', href: '/hosting/speed/cache' },
      { icon: 'tabler-world-share', label: 'CDN', href: '/hosting/speed/cdn' },
    ],
  },
  {
    title: 'WordPress',
    tools: [
      { icon: 'tabler-brand-wordpress', label: 'Install WordPress', href: '/hosting/wordpress' },
      { icon: 'tabler-copy', label: 'Staging Copies', href: '/hosting/wordpress/staging' },
      { icon: 'tabler-transfer', label: 'WP Migrator', href: '/hosting/wordpress/migrator' },
      { icon: 'tabler-refresh', label: 'WP Autoupdate', href: '/hosting/wordpress/autoupdate' },
      { icon: 'tabler-replace', label: 'Search & Replace', href: '/hosting/wordpress/search-replace' },
      { icon: 'tabler-parking', label: 'Parked Domains', href: '/hosting/domains/parked' },
    ],
  },
  {
    title: 'Domains',
    tools: [
      { icon: 'tabler-sitemap', label: 'Subdomains', href: '/hosting/domains/subdomains' },
      { icon: 'tabler-arrows-right-left', label: 'Redirects', href: '/hosting/domains/redirects' },
      { icon: 'tabler-dns', label: 'DNS Zone Editor', href: '/hosting/domains/dns' },
      { icon: 'tabler-mail', label: 'Email Accounts', href: '/hosting/email/accounts' },
      { icon: 'tabler-mail-forward', label: 'Email Forwarders', href: '/hosting/email/forwarders' },
      { icon: 'tabler-message-reply', label: 'Autoresponders', href: '/hosting/email/autoresponders' },
    ],
  },
  {
    title: 'Email & Communication',
    tools: [
      { icon: 'tabler-filter', label: 'Email Filters', href: '/hosting/email/spam' },
      { icon: 'tabler-shield-check', label: 'Email Auth', href: '/hosting/email/spam' },
      { icon: 'tabler-mail-off', label: 'Spam Protection', href: '/hosting/email/spam' },
      { icon: 'tabler-mail-share', label: 'Email Migrator', href: '#', color: '#999' },
      { icon: 'tabler-brand-google', label: 'Google Workspace', href: '#', color: '#999' },
      { icon: 'tabler-chart-line', label: 'Traffic', href: '/hosting/statistics' },
    ],
  },
  {
    title: 'Developer Tools',
    tools: [
      { icon: 'tabler-bug', label: 'Error Log', href: '#', color: '#999' },
      { icon: 'tabler-list-details', label: 'Access Logs', href: '#', color: '#999' },
      { icon: 'tabler-terminal-2', label: 'SSH', href: '/hosting/tools/ssh' },
      { icon: 'tabler-clock-cog', label: 'Cron Jobs', href: '/hosting/tools/cron' },
      { icon: 'tabler-brand-php', label: 'PHP Manager', href: '/hosting/tools/php' },
      { icon: 'tabler-key', label: 'SSH Keys', href: '/hosting/tools/ssh' },
    ],
  },
]

const SiteToolsPage = () => {
  const router = useRouter()
  const params = useParams()
  const siteId = params.id as string

  const [siteInfo, setSiteInfo] = useState<SiteInfo | null>(null)
  const [siteStats, setSiteStats] = useState<SiteStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [infoRes, statsRes] = await Promise.allSettled([
          api.get(`/hosting/websites/${siteId}/info`),
          api.get(`/hosting/websites/${siteId}/stats`),
        ])

        if (infoRes.status === 'fulfilled') {
          const raw = infoRes.value.data?.data?.data ?? infoRes.value.data?.data ?? infoRes.value.data
          setSiteInfo(raw)
        }

        if (statsRes.status === 'fulfilled') {
          const raw = statsRes.value.data?.data?.data ?? statsRes.value.data?.data ?? statsRes.value.data
          setSiteStats(raw)
        }
      } catch {
        // silently handle
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [siteId])

  const diskPercent =
    siteStats && siteStats.diskSpaceMb > 0
      ? Math.min(100, Math.round((siteStats.diskUsedMb / siteStats.diskSpaceMb) * 100))
      : 0

  const bwPercent =
    siteStats && siteStats.bandwidthMb > 0
      ? Math.min(100, Math.round((siteStats.bandwidthUsedMb / siteStats.bandwidthMb) * 100))
      : 0

  return (
    <Grid container spacing={6}>
      {/* Header */}
      <Grid size={{ xs: 12 }}>
        <Breadcrumbs sx={{ mb: 2 }}>
          <Link
            underline='hover'
            color='inherit'
            sx={{ cursor: 'pointer' }}
            onClick={() => router.push('/hosting')}
          >
            My Websites
          </Link>
          <Typography color='text.primary'>
            {loading ? 'Loading...' : siteInfo?.domain || 'Site Tools'}
          </Typography>
        </Breadcrumbs>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
          <Typography variant='h4'>Site Tools</Typography>
          {siteInfo && (
            <Chip
              label={siteInfo.status}
              size='small'
              color={siteInfo.status === 'ACTIVE' ? 'success' : 'warning'}
            />
          )}
        </Box>
        {siteInfo && (
          <Typography variant='body1' color='text.secondary'>
            {siteInfo.domain} - {siteInfo.planName}
          </Typography>
        )}
      </Grid>

      {/* Pinned Tools Grid */}
      {toolSections.map((section) => (
        <Grid size={{ xs: 12 }} key={section.title}>
          <Typography variant='subtitle2' color='text.secondary' sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: 1 }}>
            {section.title}
          </Typography>
          <Grid container spacing={2}>
            {section.tools.map((tool) => (
              <Grid size={{ xs: 6, sm: 4, md: 2 }} key={tool.label}>
                <Card
                  variant='outlined'
                  sx={{
                    cursor: tool.href !== '#' ? 'pointer' : 'default',
                    transition: 'all 0.2s',
                    opacity: tool.color === '#999' ? 0.5 : 1,
                    '&:hover': tool.href !== '#' ? {
                      borderColor: 'primary.main',
                      transform: 'translateY(-2px)',
                      boxShadow: 1,
                    } : {},
                  }}
                  onClick={() => tool.href !== '#' && router.push(tool.href)}
                >
                  <CardContent sx={{ textAlign: 'center', py: 3, px: 1 }}>
                    <i
                      className={tool.icon}
                      style={{ fontSize: 28, color: tool.color || '#7c3aed' }}
                    />
                    <Typography variant='caption' display='block' sx={{ mt: 1, lineHeight: 1.3 }}>
                      {tool.label}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>
      ))}

      {/* App Installer */}
      <Grid size={{ xs: 12 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6, sm: 4, md: 2 }}>
            <Card
              variant='outlined'
              sx={{
                cursor: 'pointer',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: 'primary.main',
                  transform: 'translateY(-2px)',
                  boxShadow: 1,
                },
              }}
              onClick={() => router.push('/hosting/wordpress')}
            >
              <CardContent sx={{ textAlign: 'center', py: 3, px: 1 }}>
                <i className='tabler-apps' style={{ fontSize: 28, color: '#7c3aed' }} />
                <Typography variant='caption' display='block' sx={{ mt: 1, lineHeight: 1.3 }}>
                  App Installer
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Grid>

      {/* Site Information */}
      <Grid size={{ xs: 12 }}>
        <Divider sx={{ my: 2 }} />
        <Typography variant='h6' sx={{ mb: 3 }}>
          Site Information
        </Typography>
      </Grid>

      {/* Disk Usage */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant='subtitle2' color='text.secondary' sx={{ mb: 2 }}>
              Disk Usage
            </Typography>
            {loading ? (
              <Skeleton height={60} />
            ) : (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant='body2'>
                    {((siteStats?.diskUsedMb || 0) / 1024).toFixed(2)} GB used
                  </Typography>
                  <Typography variant='body2' color='text.secondary'>
                    {siteStats?.diskSpaceMb === 0
                      ? 'Unlimited'
                      : `${((siteStats?.diskSpaceMb || 0) / 1024).toFixed(1)} GB total`}
                  </Typography>
                </Box>
                <LinearProgress
                  variant='determinate'
                  value={diskPercent}
                  sx={{
                    height: 10,
                    borderRadius: 5,
                    bgcolor: 'grey.200',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 5,
                      bgcolor: diskPercent > 80 ? 'error.main' : 'primary.main',
                    },
                  }}
                />
                <Typography variant='caption' color='text.secondary' sx={{ mt: 0.5 }}>
                  {diskPercent}% used
                </Typography>
              </>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* IP & Nameservers */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant='subtitle2' color='text.secondary' sx={{ mb: 2 }}>
              IP & Name Servers
            </Typography>
            {loading ? (
              <Skeleton height={60} />
            ) : (
              <>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant='body2' color='text.secondary'>
                    Server IP
                  </Typography>
                  <Typography variant='body2' fontWeight={500}>
                    {siteInfo?.ipAddress || 'Pending'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                  <Typography variant='body2' color='text.secondary'>
                    Nameserver 1
                  </Typography>
                  <Typography variant='body2' fontWeight={500}>
                    {siteInfo?.nameservers?.[0] || '-'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant='body2' color='text.secondary'>
                    Nameserver 2
                  </Typography>
                  <Typography variant='body2' fontWeight={500}>
                    {siteInfo?.nameservers?.[1] || '-'}
                  </Typography>
                </Box>
              </>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* This Month Statistics */}
      <Grid size={{ xs: 12 }}>
        <Typography variant='h6' sx={{ mb: 3, mt: 2 }}>
          This Month Statistics
        </Typography>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant='subtitle2' color='text.secondary' sx={{ mb: 2 }}>
              Unique Visitors
            </Typography>
            <Box sx={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant='body2' color='text.secondary'>
                <i className='tabler-chart-bar' style={{ fontSize: 32, display: 'block', margin: '0 auto 8px', color: '#ccc' }} />
                Statistics will appear once the site has traffic
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant='subtitle2' color='text.secondary' sx={{ mb: 2 }}>
              Pageviews
            </Typography>
            <Box sx={{ height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant='body2' color='text.secondary'>
                <i className='tabler-chart-area' style={{ fontSize: 32, display: 'block', margin: '0 auto 8px', color: '#ccc' }} />
                Statistics will appear once the site has traffic
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default SiteToolsPage
