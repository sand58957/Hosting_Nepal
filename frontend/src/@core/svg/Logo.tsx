// React Imports
import type { ImgHTMLAttributes } from 'react'

const Logo = (props: ImgHTMLAttributes<HTMLImageElement>) => {
  return (
    <img
      src='/logo.png'
      alt='Hosting Nepal'
      width={28}
      height={28}
      style={{ borderRadius: 4 }}
      {...props}
    />
  )
}

export default Logo
