import {
  CableOutlined as CableOutlinedIcon,
  ExitToApp as ExitToAppIcon,
  ExploreOutlined as ExploreOutlinedIcon,
  Face as FaceIcon,
  FavoriteBorderOutlined as FavoriteBorderOutlinedIcon,
  ListAlt as ListAltIcon,
  Menu as MenuIcon,
  Newspaper as NewspaperIcon,
  SmartToyOutlined as SmartToyOutlinedIcon,
} from '@mui/icons-material'
import { AppBar, Toolbar } from '@mui/material'
import { FC, useContext } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button, ComponentProps, Logo, Text } from './components'
import Menu from './components/menu'
import { AuthContext } from './providers/auth'
import { LINKS } from './router'
import { getLabels, Labels } from './utils/labels'

const NavBar: FC<ComponentProps> = ({ className, style }) => {
  const navigate = useNavigate()

  const { isLoading, user, login, logout } = useContext(AuthContext)

  return (
    <div className={className} style={{ ...style, zIndex: 1000 }}>
      <AppBar position="static">
        <Toolbar className="justify-content-between">
          <div
            className="d-flex align-items-center"
            onClick={() => navigate(LINKS.home)}
          >
            <Button iconButton style={{ marginLeft: -10 }} icon={<Logo />} />
            <Text className="fw-bold text-contrast">Baita</Text>
          </div>
          {!isLoading && (
            <>
              {!user ? (
                <Button
                  type="text"
                  color="inherit"
                  className="text-contrast"
                  onClick={login}
                >
                  {labels.login}
                </Button>
              ) : (
                <Menu
                  links={[
                    {
                      label: user?.name as string,
                      onClick: () => navigate(LINKS.profile),
                      icon: !user?.picture ? (
                        <FaceIcon />
                      ) : (
                        <img
                          width="24"
                          src={user.picture}
                          alt="User profile picture"
                          className="rounded-circle"
                        />
                      ),
                    },

                    {
                      label: labels.toDo,
                      onClick: () => navigate(LINKS.todo),
                      icon: <ListAltIcon color="secondary" />,
                    },
                    {
                      label: labels.feed,
                      onClick: () => navigate(LINKS.feed),
                      icon: <NewspaperIcon color="secondary" />,
                    },
                    {
                      label: labels.bots,
                      onClick: () => navigate(LINKS.bots),
                      icon: <SmartToyOutlinedIcon color="secondary" />,
                    },
                    {
                      label: labels.place,
                      onClick: () => navigate(LINKS.place),
                      icon: <ExploreOutlinedIcon color="secondary" />,
                    },
                    {
                      label: labels.feelings,
                      onClick: () => navigate(LINKS.feelings),
                      icon: <FavoriteBorderOutlinedIcon color="secondary" />,
                    },
                    {
                      label: labels.connections,
                      onClick: () => navigate(LINKS.connections),
                      icon: <CableOutlinedIcon color="secondary" />,
                    },
                    {
                      label: labels.logout,
                      onClick: logout,
                      icon: <ExitToAppIcon color="secondary" />,
                    },
                  ]}
                >
                  <MenuIcon />
                </Menu>
              )}
            </>
          )}
        </Toolbar>
      </AppBar>
    </div>
  )
}

export default NavBar

const LABELS: Labels = {
  en: {
    bots: 'Bots',
    feed: 'Feed',
    toDo: 'To Do',
    place: 'Place',
    feelings: 'Feelings',
    connections: 'Connections',
    profile: 'Profile',
    logout: 'Logout',
    login: 'Log in',
  },
  pt: {
    bots: 'Bots',
    feed: 'Feed',
    toDo: 'To Do',
    place: 'Lugar',
    feelings: 'Sentimentos',
    connections: 'Conexões',
    profile: 'Perfil',
    logout: 'Sair',
    login: 'Entrar',
  },
}

const labels = getLabels(LABELS)
