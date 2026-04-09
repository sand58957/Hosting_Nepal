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
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'

const CachePage = () => {
  const [staticCache, setStaticCache] = useState(true)
  const [dynamicCache, setDynamicCache] = useState(false)
  const [memcached, setMemcached] = useState(false)

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='SuperCacher' subheader='Boost your website speed with multi-level caching' />
          <CardContent>
            <Alert severity='info' sx={{ mb: 4 }}>
              SuperCacher provides multiple levels of caching to significantly improve your website loading speed.
            </Alert>

            {[
              {
                title: 'Static Cache',
                desc: 'Caches static files (CSS, JS, images) for faster delivery. Recommended for all websites.',
                icon: 'tabler-file-code',
                enabled: staticCache,
                toggle: () => setStaticCache(!staticCache),
                level: 'Level 1',
              },
              {
                title: 'Dynamic Cache',
                desc: 'Caches dynamically generated content. Great for WordPress and CMS websites.',
                icon: 'tabler-bolt',
                enabled: dynamicCache,
                toggle: () => setDynamicCache(!dynamicCache),
                level: 'Level 2',
              },
              {
                title: 'Memcached',
                desc: 'In-memory data caching for database-heavy applications. Requires application support.',
                icon: 'tabler-database-heart',
                enabled: memcached,
                toggle: () => setMemcached(!memcached),
                level: 'Level 3',
              },
            ].map((cache, idx) => (
              <Box key={idx}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ width: 48, height: 48, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: cache.enabled ? 'primary.lighter' : 'grey.100' }}>
                      <i className={cache.icon} style={{ fontSize: 24, color: cache.enabled ? '#7c3aed' : '#999' }} />
                    </Box>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant='subtitle1'>{cache.title}</Typography>
                        <Typography variant='caption' color='text.secondary'>({cache.level})</Typography>
                      </Box>
                      <Typography variant='body2' color='text.secondary'>{cache.desc}</Typography>
                    </Box>
                  </Box>
                  <Switch checked={cache.enabled} onChange={cache.toggle} />
                </Box>
                {idx < 2 && <Divider />}
              </Box>
            ))}

            <Box sx={{ mt: 4 }}>
              <Button variant='outlined' startIcon={<i className='tabler-trash' />} color='warning'>
                Flush All Cache
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default CachePage
