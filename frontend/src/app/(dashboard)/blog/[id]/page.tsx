'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'

// If someone visits /blog/[slug], redirect to /articles/[slug]
// If it's a UUID, redirect to /blog/[id]/edit
const BlogRedirectPage = () => {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string

  useEffect(() => {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

    if (isUuid) {
      router.replace(`/blog/${id}/edit`)
    } else {
      router.replace(`/articles/${id}`)
    }
  }, [id, router])

  return null
}

export default BlogRedirectPage
