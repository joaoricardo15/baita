import { Menu as MuiMenu, MenuItem } from '@mui/material'
import { FC, MouseEvent, ReactNode, useState } from 'react'

import { ComponentProps, Text } from '.'

const Menu: FC<
  {
    children: ReactNode
    links: {
      label: string
      icon: ReactNode
      onClick: () => void
      condition?: boolean
    }[]
  } & ComponentProps
> = ({ children, links, className, style }) => {
  const [anchorEl, setAnchorEl] = useState(null)

  const onMenuOpen = (event: MouseEvent) => {
    setAnchorEl(event.target as any)
  }

  const onMenuClose = () => {
    setAnchorEl(null)
  }

  return (
    <>
      <div
        className={className}
        style={{
          ...style,
          display: 'flex',
          flexWrap: 'wrap',
          alignContent: 'center',
        }}
      >
        <div onClick={onMenuOpen}>{children}</div>
      </div>
      <MuiMenu
        keepMounted
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={onMenuClose}
      >
        {links
          .filter((link) => link.condition === undefined || link.condition)
          .map((link) => (
            <MenuItem
              key={link.label}
              onClick={() => {
                onMenuClose()
                link.onClick()
              }}
            >
              {link.icon}
              <Text className="mx-2 fw-bold"> {link.label}</Text>
            </MenuItem>
          ))}
      </MuiMenu>
    </>
  )
}

export default Menu
