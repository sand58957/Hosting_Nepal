'use client'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import CardHeader from '@mui/material/CardHeader'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'

const FileManagerPage = () => {
  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader
            title='File Manager'
            subheader='Browse and manage your website files'
          />
          <CardContent>
            <Alert severity='info' sx={{ mb: 4 }}>
              The file manager is powered by CyberPanel. Click the button below to open the full-featured file manager in a new window.
            </Alert>
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <i className='tabler-folder' style={{ fontSize: 80, color: '#7c3aed' }} />
              <Typography variant='h6' sx={{ mt: 3, mb: 1 }}>
                CyberPanel File Manager
              </Typography>
              <Typography variant='body2' color='text.secondary' sx={{ mb: 4 }}>
                Upload, download, edit, and manage all your website files in a familiar interface.
              </Typography>
              <Button
                variant='contained'
                size='large'
                startIcon={<i className='tabler-external-link' />}
                onClick={() => window.open('/cyberpanel/filemanager', '_blank')}
              >
                Open File Manager
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
}

export default FileManagerPage
