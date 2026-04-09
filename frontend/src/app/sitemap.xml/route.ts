import { NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001/api/v1'

export async function GET() {
  try {
    const res = await fetch(`${API_URL}/blog/sitemap.xml`, { next: { revalidate: 300 } })
    const xml = await res.text()

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    })
  } catch {
    return new NextResponse(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://hostingnepals.com</loc></url></urlset>`,
      { headers: { 'Content-Type': 'application/xml' } }
    )
  }
}
