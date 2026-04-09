'use client'

import { useState } from 'react'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Switch from '@mui/material/Switch'
import Alert from '@mui/material/Alert'
import Chip from '@mui/material/Chip'

const CdnPage = () => {
  const [cdnEnabled, setCdnEnabled] = useState(false)

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='CDN (Content Delivery Network)' subheader='Serve your content from edge servers worldwide for faster loading' />
          <CardContent>
            <Card variant='outlined' sx={{ mb: 4 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <i className='tabler-world-share' style={{ fontSize: 40, color: cdnEnabled ? '#4caf50' : '#999' }} />
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant='h6'>CDN</Typography>
                        <Chip label={cdnEnabled ? 'Active' : 'Inactive'} size='small' color={cdnEnabled ? 'success' : 'default'} />
                      </Box>
                      <Typography variant='body2' color='text.secondary'>
                        Distribute your content across global edge servers
                      </Typography>
                    </Box>
                  </Box>
                  <Switch checked={cdnEnabled} onChange={() => setCdnEnabled(!cdnEnabled)} />
                </Box>
              </CardContent>
            </Card>

            {cdnEnabled && (
              <>
                <Grid container spacing={3} sx={{ mb: 4 }}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Card variant='outlined'>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant='h4' color='primary.main'>0</Typography>
                        <Typography variant='body2' color='text.secondary'>Requests Served</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Card variant='outlined'>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant='h4' color='primary.main'>0 MB</Typography>
                        <Typography variant='body2' color='text.secondary'>Bandwidth Saved</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Card variant='outlined'>
                      <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant='h4' color='primary.main'>0%</Typography>
                        <Typography variant='body2' color='text.secondary'>Cache Hit Rate</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                <Button variant='outlined' startIcon={<i className='tabler-trash' />} color='warning'>
                  Purge CDN Cache
                </Button>
              </>
            )}

            {!cdnEnabled && (
              <Alert severity='info'>
                Enable CDN to serve your static content from edge servers closest to your visitors, reducing latency and improving page load times.
              </Alert>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default CdnPage
