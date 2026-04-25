import React from 'react'

interface LogoProps {
  size?: number
  iconSize?: number
  background?: string
  border?: string
}

export function Logo({
  size = 36,
  iconSize = 22,
  background = '#ffffff',
  border = 'none',
}: LogoProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 6,
        background: background,
        border: border,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <img src="/hand.png" alt="Logo" style={{ width: iconSize, height: iconSize, objectFit: 'contain' }} />
    </div>
  )
}
