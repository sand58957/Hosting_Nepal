'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import MenuItem from '@mui/material/MenuItem'
import Stepper from '@mui/material/Stepper'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Divider from '@mui/material/Divider'
import Avatar from '@mui/material/Avatar'
import IconButton from '@mui/material/IconButton'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

interface VPSServer {
  id: string
  hostname: string
  ipAddress: string
  status: string
  type: string
}

interface AppTemplate {
  id: string
  name: string
  description: string
  icon: string
  category: string
  envVars: { key: string; label: string; defaultValue: string; required: boolean }[]
  dockerCompose: string
}

const defaultTemplates: AppTemplate[] = [
  {
    id: 'wordpress',
    name: 'WordPress',
    description: 'Open-source CMS powering over 40% of the web.',
    icon: 'tabler-brand-wordpress',
    category: 'CMS',
    envVars: [
      { key: 'WORDPRESS_DB_NAME', label: 'Database Name', defaultValue: 'wordpress', required: true },
      { key: 'WORDPRESS_DB_USER', label: 'Database User', defaultValue: 'wpuser', required: true },
      { key: 'WORDPRESS_DB_PASSWORD', label: 'Database Password', defaultValue: '', required: true },
      { key: 'MYSQL_ROOT_PASSWORD', label: 'MySQL Root Password', defaultValue: '', required: true },
    ],
    dockerCompose: `version: '3.8'
services:
  wordpress:
    image: wordpress:latest
    ports:
      - "8080:80"
    environment:
      WORDPRESS_DB_HOST: db
      WORDPRESS_DB_NAME: \${WORDPRESS_DB_NAME}
      WORDPRESS_DB_USER: \${WORDPRESS_DB_USER}
      WORDPRESS_DB_PASSWORD: \${WORDPRESS_DB_PASSWORD}
    volumes:
      - wp_data:/var/www/html
    depends_on:
      - db
  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: \${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: \${WORDPRESS_DB_NAME}
      MYSQL_USER: \${WORDPRESS_DB_USER}
      MYSQL_PASSWORD: \${WORDPRESS_DB_PASSWORD}
    volumes:
      - db_data:/var/lib/mysql
volumes:
  wp_data:
  db_data:`,
  },
  {
    id: 'mysql',
    name: 'MySQL',
    description: 'Popular open-source relational database.',
    icon: 'tabler-database',
    category: 'Database',
    envVars: [
      { key: 'MYSQL_ROOT_PASSWORD', label: 'Root Password', defaultValue: '', required: true },
      { key: 'MYSQL_DATABASE', label: 'Database Name', defaultValue: 'mydb', required: false },
    ],
    dockerCompose: `version: '3.8'
services:
  mysql:
    image: mysql:8.0
    ports:
      - "3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: \${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: \${MYSQL_DATABASE}
    volumes:
      - mysql_data:/var/lib/mysql
volumes:
  mysql_data:`,
  },
  {
    id: 'postgresql',
    name: 'PostgreSQL',
    description: 'Advanced open-source relational database.',
    icon: 'tabler-database',
    category: 'Database',
    envVars: [
      { key: 'POSTGRES_PASSWORD', label: 'Password', defaultValue: '', required: true },
      { key: 'POSTGRES_DB', label: 'Database Name', defaultValue: 'mydb', required: false },
    ],
    dockerCompose: `version: '3.8'
services:
  postgres:
    image: postgres:16
    ports:
      - "5432:5432"
    environment:
      POSTGRES_PASSWORD: \${POSTGRES_PASSWORD}
      POSTGRES_DB: \${POSTGRES_DB}
    volumes:
      - pg_data:/var/lib/postgresql/data
volumes:
  pg_data:`,
  },
  {
    id: 'mongodb',
    name: 'MongoDB',
    description: 'NoSQL document database.',
    icon: 'tabler-database',
    category: 'Database',
    envVars: [
      { key: 'MONGO_INITDB_ROOT_USERNAME', label: 'Root Username', defaultValue: 'admin', required: true },
      { key: 'MONGO_INITDB_ROOT_PASSWORD', label: 'Root Password', defaultValue: '', required: true },
    ],
    dockerCompose: `version: '3.8'
services:
  mongo:
    image: mongo:7
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: \${MONGO_INITDB_ROOT_USERNAME}
      MONGO_INITDB_ROOT_PASSWORD: \${MONGO_INITDB_ROOT_PASSWORD}
    volumes:
      - mongo_data:/data/db
volumes:
  mongo_data:`,
  },
  {
    id: 'redis',
    name: 'Redis',
    description: 'In-memory data structure store.',
    icon: 'tabler-bolt',
    category: 'Cache',
    envVars: [
      { key: 'REDIS_PASSWORD', label: 'Password (optional)', defaultValue: '', required: false },
    ],
    dockerCompose: `version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    command: redis-server --requirepass \${REDIS_PASSWORD:-}
    volumes:
      - redis_data:/data
volumes:
  redis_data:`,
  },
  {
    id: 'nginx',
    name: 'Nginx',
    description: 'High-performance HTTP server and reverse proxy.',
    icon: 'tabler-server',
    category: 'Web Server',
    envVars: [],
    dockerCompose: `version: '3.8'
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./html:/usr/share/nginx/html
      - ./nginx.conf:/etc/nginx/nginx.conf:ro`,
  },
  {
    id: 'nodejs',
    name: 'Node.js',
    description: 'JavaScript runtime for server-side apps.',
    icon: 'tabler-brand-nodejs',
    category: 'Runtime',
    envVars: [
      { key: 'NODE_ENV', label: 'Environment', defaultValue: 'production', required: false },
      { key: 'PORT', label: 'Port', defaultValue: '3000', required: false },
    ],
    dockerCompose: `version: '3.8'
services:
  app:
    image: node:20-alpine
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: \${NODE_ENV}
      PORT: \${PORT}
    working_dir: /app
    volumes:
      - ./app:/app
    command: npm start`,
  },
  {
    id: 'nextjs',
    name: 'Next.js',
    description: 'React framework with SSR and static generation.',
    icon: 'tabler-brand-nextjs',
    category: 'Framework',
    envVars: [
      { key: 'NODE_ENV', label: 'Environment', defaultValue: 'production', required: false },
    ],
    dockerCompose: `version: '3.8'
services:
  nextjs:
    image: node:20-alpine
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: \${NODE_ENV}
    working_dir: /app
    volumes:
      - ./app:/app
    command: npm run start`,
  },
  {
    id: 'mern-stack',
    name: 'MERN Stack',
    description: 'MongoDB, Express.js, React, Node.js with Nginx.',
    icon: 'tabler-stack-2',
    category: 'Full Stack',
    envVars: [
      { key: 'MONGO_INITDB_ROOT_USERNAME', label: 'MongoDB Username', defaultValue: 'admin', required: true },
      { key: 'MONGO_INITDB_ROOT_PASSWORD', label: 'MongoDB Password', defaultValue: '', required: true },
      { key: 'NODE_ENV', label: 'Environment', defaultValue: 'production', required: false },
    ],
    dockerCompose: `version: '3.8'
services:
  frontend:
    image: node:20-alpine
    ports:
      - "3000:3000"
    working_dir: /app
    volumes:
      - ./frontend:/app
    command: npm start
  backend:
    image: node:20-alpine
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: \${NODE_ENV}
      MONGODB_URI: mongodb://\${MONGO_INITDB_ROOT_USERNAME}:\${MONGO_INITDB_ROOT_PASSWORD}@mongo:27017
    working_dir: /app
    volumes:
      - ./backend:/app
    command: npm start
    depends_on:
      - mongo
  mongo:
    image: mongo:7
    environment:
      MONGO_INITDB_ROOT_USERNAME: \${MONGO_INITDB_ROOT_USERNAME}
      MONGO_INITDB_ROOT_PASSWORD: \${MONGO_INITDB_ROOT_PASSWORD}
    volumes:
      - mongo_data:/data/db
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    depends_on:
      - frontend
      - backend
volumes:
  mongo_data:`,
  },
  {
    id: 'lamp-stack',
    name: 'LAMP Stack',
    description: 'Linux, Apache, MySQL, PHP with phpMyAdmin.',
    icon: 'tabler-stack-2',
    category: 'Full Stack',
    envVars: [
      { key: 'MYSQL_ROOT_PASSWORD', label: 'MySQL Root Password', defaultValue: '', required: true },
      { key: 'MYSQL_DATABASE', label: 'Database Name', defaultValue: 'myapp', required: true },
    ],
    dockerCompose: `version: '3.8'
services:
  php-apache:
    image: php:8.2-apache
    ports:
      - "80:80"
    volumes:
      - ./html:/var/www/html
    depends_on:
      - mysql
  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: \${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: \${MYSQL_DATABASE}
    volumes:
      - mysql_data:/var/lib/mysql
  phpmyadmin:
    image: phpmyadmin:latest
    ports:
      - "8080:80"
    environment:
      PMA_HOST: mysql
      MYSQL_ROOT_PASSWORD: \${MYSQL_ROOT_PASSWORD}
    depends_on:
      - mysql
volumes:
  mysql_data:`,
  },
]

const steps = ['Select Server', 'Choose App', 'Configure', 'Review & Deploy']

const DeployAppPage = () => {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedTemplate = searchParams.get('template')

  const [activeStep, setActiveStep] = useState(0)
  const [servers, setServers] = useState<VPSServer[]>([])
  const [templates, setTemplates] = useState<AppTemplate[]>(defaultTemplates)
  const [loadingServers, setLoadingServers] = useState(true)
  const [selectedServer, setSelectedServer] = useState('')
  const [selectedTemplate, setSelectedTemplate] = useState<AppTemplate | null>(null)
  const [useCustomCompose, setUseCustomCompose] = useState(false)
  const [customCompose, setCustomCompose] = useState('')
  const [envValues, setEnvValues] = useState<Record<string, string>>({})
  const [deploying, setDeploying] = useState(false)

  useEffect(() => {
    const fetchServers = async () => {
      try {
        const res = await api.get('/hosting')
        const raw = res.data?.data?.data ?? res.data?.data ?? res.data
        const list = Array.isArray(raw) ? raw : raw?.hostings ?? raw?.data ?? []
        const vpsList = (Array.isArray(list) ? list : []).filter(
          (h: any) => h.type === 'VPS' || h.type === 'vps' || h.type === 'VDS' || h.type === 'vds'
        )
        setServers(vpsList)
      } catch {
        setServers([])
      } finally {
        setLoadingServers(false)
      }
    }

    const fetchTemplates = async () => {
      try {
        const res = await api.get('/hosting/containers/templates')
        const raw = res.data?.data?.data ?? res.data?.data ?? res.data
        const list = Array.isArray(raw) ? raw : raw?.templates ?? raw?.data ?? []
        if (list.length > 0) setTemplates(list)
      } catch {
        // use defaults
      }
    }

    fetchServers()
    fetchTemplates()
  }, [])

  // Pre-select template from URL
  useEffect(() => {
    if (preselectedTemplate && templates.length > 0) {
      const found = templates.find((t) => t.id === preselectedTemplate)
      if (found) {
        setSelectedTemplate(found)
        const defaults: Record<string, string> = {}
        found.envVars.forEach((v) => { defaults[v.key] = v.defaultValue })
        setEnvValues(defaults)
        if (selectedServer) setActiveStep(2)
        else setActiveStep(0)
      }
    }
  }, [preselectedTemplate, templates])

  const handleSelectTemplate = (template: AppTemplate) => {
    setSelectedTemplate(template)
    setUseCustomCompose(false)
    const defaults: Record<string, string> = {}
    template.envVars.forEach((v) => { defaults[v.key] = v.defaultValue })
    setEnvValues(defaults)
  }

  const handleDeploy = async () => {
    setDeploying(true)
    try {
      await api.post('/hosting/containers/deploy', {
        serverId: selectedServer,
        templateId: selectedTemplate?.id,
        dockerCompose: useCustomCompose ? customCompose : selectedTemplate?.dockerCompose,
        envVars: envValues,
      })
      router.push('/containers')
    } catch {
      // silently handle
    } finally {
      setDeploying(false)
    }
  }

  const canProceedStep = (step: number) => {
    switch (step) {
      case 0: return !!selectedServer
      case 1: return !!(selectedTemplate || (useCustomCompose && customCompose.trim()))
      case 2: return true
      case 3: return true
      default: return false
    }
  }

  const selectedServerObj = servers.find((s) => s.id === selectedServer)

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant='h4'>Deploy App</Typography>
          <Typography variant='body2' color='text.secondary'>
            Deploy a containerized application on your VPS server
          </Typography>
        </Box>
      </Grid>

      {/* Stepper */}
      <Grid size={{ xs: 12 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Grid>

      {/* Step 1: Select Server */}
      {activeStep === 0 && (
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant='h6' sx={{ mb: 3 }}>Select VPS Server</Typography>
              {loadingServers ? (
                <Skeleton variant='rectangular' height={56} />
              ) : servers.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <i className='tabler-server-off' style={{ fontSize: 48, color: '#ccc' }} />
                  <Typography variant='body1' color='text.secondary' sx={{ mt: 2, mb: 2 }}>
                    No VPS/VDS servers found. You need a server with Docker installed to deploy containers.
                  </Typography>
                  <Button variant='contained' onClick={() => router.push('/vps/order')}>
                    Order a VPS
                  </Button>
                </Box>
              ) : (
                <>
                  <CustomTextField
                    select
                    label='VPS/VDS Server'
                    value={selectedServer}
                    onChange={(e) => setSelectedServer(e.target.value)}
                    fullWidth
                    helperText='Select the server where you want to deploy the container'
                  >
                    {servers.map((s) => (
                      <MenuItem key={s.id} value={s.id}>
                        {s.hostname} ({s.ipAddress}) - {s.type}
                      </MenuItem>
                    ))}
                  </CustomTextField>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                    <Button
                      variant='contained'
                      disabled={!selectedServer}
                      onClick={() => setActiveStep(1)}
                    >
                      Next
                    </Button>
                  </Box>
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Step 2: Choose App */}
      {activeStep === 1 && (
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant='h6'>Choose Application</Typography>
                <Button
                  variant={useCustomCompose ? 'contained' : 'outlined'}
                  size='small'
                  onClick={() => { setUseCustomCompose(!useCustomCompose); setSelectedTemplate(null) }}
                  startIcon={<i className='tabler-code' />}
                >
                  Custom Docker Compose
                </Button>
              </Box>

              {useCustomCompose ? (
                <>
                  <CustomTextField
                    label='Docker Compose YAML'
                    value={customCompose}
                    onChange={(e) => setCustomCompose(e.target.value)}
                    fullWidth
                    multiline
                    rows={16}
                    placeholder={`version: '3.8'\nservices:\n  app:\n    image: myapp:latest\n    ports:\n      - "3000:3000"`}
                    helperText='Paste your Docker Compose YAML configuration'
                    sx={{ fontFamily: 'monospace' }}
                  />
                </>
              ) : (
                <Grid container spacing={3}>
                  {templates.map((template) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={template.id}>
                      <Card
                        variant='outlined'
                        sx={{
                          cursor: 'pointer',
                          border: selectedTemplate?.id === template.id ? 2 : 1,
                          borderColor: selectedTemplate?.id === template.id ? 'primary.main' : 'divider',
                          transition: 'all 0.2s',
                          '&:hover': { borderColor: 'primary.main' },
                        }}
                        onClick={() => handleSelectTemplate(template)}
                      >
                        <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Avatar sx={{ bgcolor: 'action.hover' }}>
                            <i className={template.icon} style={{ fontSize: 24 }} />
                          </Avatar>
                          <Box>
                            <Typography variant='body1' fontWeight={600}>{template.name}</Typography>
                            <Typography variant='caption' color='text.secondary'>{template.category}</Typography>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                <Button variant='outlined' onClick={() => setActiveStep(0)}>Back</Button>
                <Button
                  variant='contained'
                  disabled={!canProceedStep(1)}
                  onClick={() => setActiveStep(2)}
                >
                  Next
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Step 3: Configure */}
      {activeStep === 2 && (
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant='h6' sx={{ mb: 3 }}>Configure Environment Variables</Typography>

              {selectedTemplate && selectedTemplate.envVars.length > 0 ? (
                <Grid container spacing={3}>
                  {selectedTemplate.envVars.map((envVar) => (
                    <Grid size={{ xs: 12, md: 6 }} key={envVar.key}>
                      <CustomTextField
                        label={envVar.label}
                        placeholder={envVar.defaultValue || envVar.key}
                        value={envValues[envVar.key] || ''}
                        onChange={(e) => setEnvValues({ ...envValues, [envVar.key]: e.target.value })}
                        fullWidth
                        required={envVar.required}
                        type={envVar.key.toLowerCase().includes('password') ? 'password' : 'text'}
                        helperText={envVar.key}
                      />
                    </Grid>
                  ))}
                </Grid>
              ) : useCustomCompose ? (
                <Alert severity='info'>
                  Custom Docker Compose configurations manage their own environment variables within the YAML file.
                </Alert>
              ) : (
                <Alert severity='info'>
                  This template does not require any environment variables.
                </Alert>
              )}

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                <Button variant='outlined' onClick={() => setActiveStep(1)}>Back</Button>
                <Button variant='contained' onClick={() => setActiveStep(3)}>Next</Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Step 4: Review & Deploy */}
      {activeStep === 3 && (
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant='h6' sx={{ mb: 3 }}>Review & Deploy</Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant='body1' color='text.secondary'>Server</Typography>
                  <Typography variant='body1' fontWeight={500}>
                    {selectedServerObj?.hostname} ({selectedServerObj?.ipAddress})
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant='body1' color='text.secondary'>Application</Typography>
                  <Typography variant='body1' fontWeight={500}>
                    {useCustomCompose ? 'Custom Docker Compose' : selectedTemplate?.name}
                  </Typography>
                </Box>
                {selectedTemplate && !useCustomCompose && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant='body1' color='text.secondary'>Category</Typography>
                    <Typography variant='body1'>{selectedTemplate.category}</Typography>
                  </Box>
                )}
              </Box>

              <Divider sx={{ my: 2 }} />

              {/* Docker Compose Preview */}
              <Typography variant='subtitle2' sx={{ mb: 1 }}>Docker Compose YAML</Typography>
              <Box
                sx={{
                  bgcolor: 'action.hover',
                  p: 2,
                  borderRadius: 1,
                  maxHeight: 300,
                  overflow: 'auto',
                  mb: 3,
                }}
              >
                <Typography
                  variant='body2'
                  component='pre'
                  sx={{ fontFamily: 'monospace', whiteSpace: 'pre-wrap', m: 0 }}
                >
                  {useCustomCompose ? customCompose : selectedTemplate?.dockerCompose}
                </Typography>
              </Box>

              <Alert severity='info' sx={{ mb: 3 }}>
                The application will be deployed via SSH to your VPS server. Make sure Docker and Docker Compose are installed.
              </Alert>

              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button variant='outlined' onClick={() => setActiveStep(2)}>Back</Button>
                <Button
                  variant='contained'
                  size='large'
                  onClick={handleDeploy}
                  disabled={deploying}
                  startIcon={deploying ? <CircularProgress size={20} /> : <i className='tabler-rocket' />}
                >
                  {deploying ? 'Deploying...' : 'Deploy Application'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  )
}

export default DeployAppPage
