import { ImageResponse } from 'next/og'
 
export const runtime = 'edge'
 
export const size = {
  width: 180,
  height: 180,
}
 
export const contentType = 'image/png'
 
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#ffffff',
          borderRadius: '20px',
        }}
      >
        <img src="/iga-logo.png" alt="IGA Prep" width="140" height="140" style={{ objectFit: 'contain' }} />
      </div>
    ),
    {
      ...size,
    }
  )
}
