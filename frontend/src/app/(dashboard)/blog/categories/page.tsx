'use client'

import { useState, useEffect } from 'react'

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
import Box from '@mui/material/Box'
import Alert from '@mui/material/Alert'
import IconButton from '@mui/material/IconButton'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import CircularProgress from '@mui/material/CircularProgress'
import Skeleton from '@mui/material/Skeleton'

import CustomTextField from '@core/components/mui/TextField'
import api from '@/lib/api'

interface Category { id: string; name: string; slug: string; description: string | null; _count?: { posts: number } }

const BlogCategoriesPage = () => {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const fetchCategories = async () => {
    try {
      const res = await api.get('/blog/categories')
      const d = res.data?.data ?? res.data

      setCategories(Array.isArray(d) ? d : [])
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => { fetchCategories() }, [])

  const handleSave = async () => {
    if (!name.trim()) return

    setSaving(true)

    try {
      if (editId) {
        await api.patch(`/blog/categories/${editId}`, { name: name.trim(), description: description || undefined })
      } else {
        await api.post('/blog/categories', { name: name.trim(), description: description || undefined })
      }

      setDialogOpen(false)
      setName('')
      setDescription('')
      setEditId(null)
      setSuccessMsg(editId ? 'Category updated' : 'Category created')
      setTimeout(() => setSuccessMsg(null), 3000)
      fetchCategories()
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed')
      setTimeout(() => setErrorMsg(null), 4000)
    } finally { setSaving(false) }
  }

  const handleEdit = (cat: Category) => {
    setEditId(cat.id)
    setName(cat.name)
    setDescription(cat.description || '')
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/blog/categories/${id}`)
      setSuccessMsg('Category deleted')
      setTimeout(() => setSuccessMsg(null), 3000)
      fetchCategories()
    } catch { setErrorMsg('Failed to delete'); setTimeout(() => setErrorMsg(null), 4000) }
  }

  return (
    <Grid container spacing={6}>
      {successMsg && <Grid size={{ xs: 12 }}><Alert severity='success' onClose={() => setSuccessMsg(null)}>{successMsg}</Alert></Grid>}
      {errorMsg && <Grid size={{ xs: 12 }}><Alert severity='error' onClose={() => setErrorMsg(null)}>{errorMsg}</Alert></Grid>}

      <Grid size={{ xs: 12 }}>
        <Card>
          <CardHeader title='Blog Categories'
            action={<Button variant='contained' startIcon={<i className='tabler-plus' />} onClick={() => { setEditId(null); setName(''); setDescription(''); setDialogOpen(true) }}>Add Category</Button>}
          />
          <CardContent>
            {loading ? (
              <Box>{[...Array(3)].map((_, i) => <Skeleton key={i} height={50} sx={{ mb: 1 }} />)}</Box>
            ) : categories.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 6 }}>
                <Typography color='text.secondary'>No categories yet. Create your first category.</Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Name</TableCell>
                      <TableCell>Slug</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Posts</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {categories.map(cat => (
                      <TableRow key={cat.id}>
                        <TableCell><Typography fontWeight={600}>{cat.name}</Typography></TableCell>
                        <TableCell><Typography variant='caption' color='text.secondary'>/{cat.slug}</Typography></TableCell>
                        <TableCell>{cat.description || '-'}</TableCell>
                        <TableCell>{cat._count?.posts ?? 0}</TableCell>
                        <TableCell>
                          <IconButton size='small' onClick={() => handleEdit(cat)}><i className='tabler-edit' style={{ fontSize: 18 }} /></IconButton>
                          <IconButton size='small' color='error' onClick={() => handleDelete(cat.id)}><i className='tabler-trash' style={{ fontSize: 18 }} /></IconButton>
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

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} maxWidth='sm' fullWidth>
        <DialogTitle>{editId ? 'Edit Category' : 'New Category'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
            <CustomTextField fullWidth label='Name' value={name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)} placeholder='Category name' />
            <CustomTextField fullWidth label='Description' value={description} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)} multiline rows={3} placeholder='Optional description' />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
          <Button variant='contained' onClick={handleSave} disabled={saving || !name.trim()}
            startIcon={saving ? <CircularProgress size={16} /> : undefined}>
            {editId ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  )
}

export default BlogCategoriesPage
