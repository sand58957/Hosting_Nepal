'use client'

import { useState, useEffect } from 'react'

import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Grid from '@mui/material/Grid'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Box from '@mui/material/Box'
import Skeleton from '@mui/material/Skeleton'
import Alert from '@mui/material/Alert'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Avatar from '@mui/material/Avatar'
import MenuItem from '@mui/material/MenuItem'
import LinearProgress from '@mui/material/LinearProgress'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

interface VPSServer {
  id: string
  hostname: string
  ipAddress: string
  status: string
  type: string
}

interface ClusterInfo {
  version: string
  nodes: number
  pods: number
  services: number
}

interface K8sNode {
  name: string
  status: string
  role: string
  cpu: string
  memory: string
  age: string
}

interface K8sPod {
  name: string
  namespace: string
  status: string
  restarts: number
  age: string
}

interface K8sService {
  name: string
  type: string
  ports: string
  namespace: string
}

interface K8sDeployment {
  name: string
  ready: string
  upToDate: number
  available: number
  namespace: string
}

const podStatusColor: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
  Running: 'success',
  Pending: 'warning',
  Failed: 'error',
  Succeeded: 'success',
  CrashLoopBackOff: 'error',
  ContainerCreating: 'warning',
}

const kubectlCommands = [
  { cmd: 'kubectl get pods -A', desc: 'List all pods across namespaces' },
  { cmd: 'kubectl get services -A', desc: 'List all services' },
  { cmd: 'kubectl get deployments -A', desc: 'List all deployments' },
  { cmd: 'kubectl get nodes', desc: 'List cluster nodes' },
  { cmd: 'kubectl logs <pod-name>', desc: 'View pod logs' },
  { cmd: 'kubectl describe pod <pod-name>', desc: 'Describe a pod' },
  { cmd: 'kubectl apply -f manifest.yaml', desc: 'Apply a manifest' },
  { cmd: 'kubectl delete pod <pod-name>', desc: 'Delete a pod' },
]

const KubernetesPage = () => {
  const [selectedServer, setSelectedServer] = useState('')
  const [servers, setServers] = useState<VPSServer[]>([])
  const [loadingServers, setLoadingServers] = useState(true)
  const [loading, setLoading] = useState(false)
  const [installing, setInstalling] = useState(false)
  const [clusterInfo, setClusterInfo] = useState<ClusterInfo | null>(null)
  const [nodes, setNodes] = useState<K8sNode[]>([])
  const [pods, setPods] = useState<K8sPod[]>([])
  const [services, setServices] = useState<K8sService[]>([])
  const [deployments, setDeployments] = useState<K8sDeployment[]>([])
  const [k3sInstalled, setK3sInstalled] = useState<boolean | null>(null)

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

    fetchServers()
  }, [])

  const fetchK8sData = async (serverId: string) => {
    setLoading(true)
    try {
      const res = await api.get('/hosting').catch(() => ({ data: { data: [] } }))
      const data = res.data?.data?.data ?? res.data?.data ?? res.data
      setK3sInstalled(data?.installed ?? false)
      setClusterInfo(data?.clusterInfo || null)
      setNodes(data?.nodes || [])
      setPods(data?.pods || [])
      setServices(data?.services || [])
      setDeployments(data?.deployments || [])
    } catch {
      setK3sInstalled(false)
      setClusterInfo(null)
      setNodes([])
      setPods([])
      setServices([])
      setDeployments([])
    } finally {
      setLoading(false)
    }
  }

  const handleServerChange = (serverId: string) => {
    setSelectedServer(serverId)
    if (serverId) fetchK8sData(serverId)
  }

  const handleInstallK3s = async () => {
    setInstalling(true)
    try {
      await new Promise(r => setTimeout(r, 1000))
      await fetchK8sData(selectedServer)
    } catch {
      // silently handle
    } finally {
      setInstalling(false)
    }
  }

  const infoCards = clusterInfo ? [
    { label: 'k3s Version', value: clusterInfo.version, icon: 'tabler-hexagons', color: '#FFC107' },
    { label: 'Nodes', value: clusterInfo.nodes, icon: 'tabler-server', color: '#2196F3' },
    { label: 'Pods', value: clusterInfo.pods, icon: 'tabler-box', color: '#4CAF50' },
    { label: 'Services', value: clusterInfo.services, icon: 'tabler-network', color: '#9C27B0' },
  ] : []

  return (
    <Grid container spacing={6}>
      <Grid size={{ xs: 12 }}>
        <Box sx={{ mb: 2 }}>
          <Typography variant='h4'>Kubernetes (k3s)</Typography>
          <Typography variant='body2' color='text.secondary'>
            Manage lightweight Kubernetes clusters on your VPS servers
          </Typography>
        </Box>
      </Grid>

      {/* Server Selector */}
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            {loadingServers ? (
              <Skeleton variant='rectangular' height={56} />
            ) : (
              <CustomTextField
                select
                label='Select VPS/VDS Server'
                value={selectedServer}
                onChange={(e) => handleServerChange(e.target.value)}
                fullWidth
                helperText='Select a server to manage its Kubernetes (k3s) installation'
              >
                <MenuItem value=''>-- Select a server --</MenuItem>
                {servers.map((s) => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.hostname} ({s.ipAddress}) - {s.type}
                  </MenuItem>
                ))}
              </CustomTextField>
            )}
          </CardContent>
        </Card>
      </Grid>

      {!selectedServer && (
        <Grid size={{ xs: 12 }}>
          <Alert severity='info' icon={<i className='tabler-info-circle' />}>
            k3s is lightweight Kubernetes -- perfect for single-node VPS. Select a server above to get started.
          </Alert>
        </Grid>
      )}

      {loading && (
        <Grid size={{ xs: 12 }}>
          <LinearProgress />
        </Grid>
      )}

      {/* Install k3s prompt */}
      {selectedServer && !loading && k3sInstalled === false && (
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Avatar sx={{ width: 72, height: 72, mx: 'auto', mb: 2, bgcolor: '#FFC107' }}>
                  <i className='tabler-hexagons' style={{ fontSize: 36, color: '#fff' }} />
                </Avatar>
                <Typography variant='h5' sx={{ mb: 1 }}>k3s Not Installed</Typography>
                <Typography variant='body1' color='text.secondary' sx={{ mb: 3, maxWidth: 480, mx: 'auto' }}>
                  k3s is a lightweight, certified Kubernetes distribution designed for production workloads on resource-constrained environments. Perfect for single-node VPS deployments.
                </Typography>
                <Button
                  variant='contained'
                  size='large'
                  onClick={handleInstallK3s}
                  disabled={installing}
                  startIcon={installing ? <CircularProgress size={20} /> : <i className='tabler-download' />}
                >
                  {installing ? 'Installing k3s...' : 'Install k3s'}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Cluster Info Cards */}
      {selectedServer && !loading && clusterInfo && (
        <>
          {infoCards.map((card) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={card.label}>
              <Card>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <Avatar sx={{ bgcolor: card.color, width: 48, height: 48 }}>
                    <i className={card.icon} style={{ fontSize: 24, color: '#fff' }} />
                  </Avatar>
                  <Box>
                    <Typography variant='h5'>{card.value}</Typography>
                    <Typography variant='body2' color='text.secondary'>{card.label}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </>
      )}

      {/* Nodes Table */}
      {selectedServer && !loading && k3sInstalled && (
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant='h6' sx={{ mb: 2 }}>Nodes</Typography>
              {nodes.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant='body2' color='text.secondary'>No nodes data available</Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell>CPU</TableCell>
                        <TableCell>Memory</TableCell>
                        <TableCell>Age</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {nodes.map((node) => (
                        <TableRow key={node.name} hover>
                          <TableCell><Typography variant='body2' fontWeight={600}>{node.name}</Typography></TableCell>
                          <TableCell>
                            <Chip label={node.status} color={node.status === 'Ready' ? 'success' : 'error'} size='small' />
                          </TableCell>
                          <TableCell>{node.role}</TableCell>
                          <TableCell>{node.cpu}</TableCell>
                          <TableCell>{node.memory}</TableCell>
                          <TableCell>{node.age}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Pods Table */}
      {selectedServer && !loading && k3sInstalled && (
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant='h6' sx={{ mb: 2 }}>Pods</Typography>
              {pods.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant='body2' color='text.secondary'>No pods found</Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Namespace</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Restarts</TableCell>
                        <TableCell>Age</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {pods.map((pod) => (
                        <TableRow key={`${pod.namespace}-${pod.name}`} hover>
                          <TableCell><Typography variant='body2' fontWeight={600}>{pod.name}</Typography></TableCell>
                          <TableCell><Chip label={pod.namespace} size='small' variant='outlined' /></TableCell>
                          <TableCell>
                            <Chip label={pod.status} color={podStatusColor[pod.status] || 'default'} size='small' />
                          </TableCell>
                          <TableCell>{pod.restarts}</TableCell>
                          <TableCell>{pod.age}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Services Table */}
      {selectedServer && !loading && k3sInstalled && (
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant='h6' sx={{ mb: 2 }}>Services</Typography>
              {services.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant='body2' color='text.secondary'>No services found</Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell>Ports</TableCell>
                        <TableCell>Namespace</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {services.map((svc) => (
                        <TableRow key={`${svc.namespace}-${svc.name}`} hover>
                          <TableCell><Typography variant='body2' fontWeight={600}>{svc.name}</Typography></TableCell>
                          <TableCell>
                            <Chip
                              label={svc.type}
                              size='small'
                              color={svc.type === 'LoadBalancer' ? 'primary' : svc.type === 'NodePort' ? 'warning' : 'default'}
                            />
                          </TableCell>
                          <TableCell><Typography variant='body2' sx={{ fontFamily: 'monospace' }}>{svc.ports}</Typography></TableCell>
                          <TableCell>{svc.namespace}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Deployments Table */}
      {selectedServer && !loading && k3sInstalled && (
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant='h6' sx={{ mb: 2 }}>Deployments</Typography>
              {deployments.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant='body2' color='text.secondary'>No deployments found</Typography>
                </Box>
              ) : (
                <TableContainer>
                  <Table size='small'>
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Ready</TableCell>
                        <TableCell>Up-to-date</TableCell>
                        <TableCell>Available</TableCell>
                        <TableCell>Namespace</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {deployments.map((dep) => (
                        <TableRow key={`${dep.namespace}-${dep.name}`} hover>
                          <TableCell><Typography variant='body2' fontWeight={600}>{dep.name}</Typography></TableCell>
                          <TableCell>{dep.ready}</TableCell>
                          <TableCell>{dep.upToDate}</TableCell>
                          <TableCell>{dep.available}</TableCell>
                          <TableCell><Chip label={dep.namespace} size='small' variant='outlined' /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Kubectl Commands Reference */}
      {selectedServer && !loading && k3sInstalled && (
        <Grid size={{ xs: 12 }}>
          <Card>
            <CardContent>
              <Typography variant='h6' sx={{ mb: 2 }}>
                <i className='tabler-terminal' style={{ fontSize: 20, marginRight: 8, verticalAlign: 'middle' }} />
                Kubectl Commands Reference
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {kubectlCommands.map((item, idx) => (
                  <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 1, borderBottom: idx < kubectlCommands.length - 1 ? '1px solid' : 'none', borderColor: 'divider' }}>
                    <Box
                      sx={{
                        bgcolor: 'action.hover',
                        px: 1.5,
                        py: 0.5,
                        borderRadius: 1,
                        fontFamily: 'monospace',
                        fontSize: '0.85rem',
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {item.cmd}
                    </Box>
                    <Typography variant='body2' color='text.secondary'>{item.desc}</Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* k3s Info */}
      <Grid size={{ xs: 12 }}>
        <Alert severity='info'>
          k3s is lightweight Kubernetes -- perfect for single-node VPS. It uses fewer resources than standard Kubernetes while being fully compliant. SSH into your VPS to use kubectl commands directly.
        </Alert>
      </Grid>
    </Grid>
  )
}

export default KubernetesPage
