import React from 'react';
import { Box, Typography, Avatar, IconButton, Tooltip } from '@mui/material';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import StoreIcon from '@mui/icons-material/Store';
import GroupIcon from '@mui/icons-material/Group';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import LogoutIcon from '@mui/icons-material/Logout';
import { useAuth } from '../context/AuthContext';

const itemsNav = [
  { to: '/gastos', label: 'Gastos', icono: ReceiptLongIcon, roles: null },
  { to: '/catalogo', label: 'Catálogo', icono: UploadFileIcon, roles: ['MASTER'] },
  { to: '/locales', label: 'Locales', icono: StoreIcon, roles: ['MASTER'] },
  { to: '/usuarios', label: 'Usuarios', icono: GroupIcon, roles: ['MASTER'] }
];

export default function Layout() {
  const { usuario, logout } = useAuth();
  const navegar = useNavigate();

  function manejarLogout() {
    logout();
    navegar('/login');
  }

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box
        sx={{
          width: 216,
          flexShrink: 0,
          bgcolor: '#1F1B16',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, px: 1, pb: 3 }}>
          <Box
            component="img"
            src="/favicon.png"
            alt="Kami Sushi"
            sx={{ width: 32, height: 32, borderRadius: '9px' }}
          />
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>
            Gastos Kami
          </Typography>
        </Box>

        {itemsNav
          .filter((item) => !item.roles || item.roles.includes(usuario?.rol))
          .map(({ to, label, icono: Icono }) => (
            <NavLink
              key={to}
              to={to}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 10,
                textDecoration: 'none',
                color: isActive ? '#FFFFFF' : '#C9C2B4',
                background: isActive ? '#322C24' : 'transparent',
                fontSize: 13,
                fontWeight: 600
              })}
            >
              <Icono sx={{ fontSize: 16 }} />
              {label}
            </NavLink>
          ))}

        <Box sx={{ mt: 'auto', display: 'flex', alignItems: 'center', gap: 1.2, px: 1, py: 1 }}>
          <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: '#4A4238' }}>
            {usuario?.nombre?.[0]?.toUpperCase()}
          </Avatar>
          <Box sx={{ lineHeight: 1.2, flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: 12, color: '#fff', fontWeight: 600 }} noWrap>
              {usuario?.nombre}
            </Typography>
            <Typography sx={{ fontSize: 11, color: '#8A8476' }}>{usuario?.rol}</Typography>
          </Box>
          <Tooltip title="Cerrar sesión">
            <IconButton size="small" onClick={manejarLogout} sx={{ color: '#C9C2B4' }}>
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      <Box sx={{ flex: 1, overflowY: 'auto', p: { xs: 2, md: 4 } }}>
        <Outlet />
      </Box>
    </Box>
  );
}
