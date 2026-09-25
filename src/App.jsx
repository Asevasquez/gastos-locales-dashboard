import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RutaProtegida from './components/RutaProtegida';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import GastosPage from './pages/GastosPage';
import CatalogoPage from './pages/CatalogoPage';
import LocalesPage from './pages/LocalesPage';
import UsuariosPage from './pages/UsuariosPage';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            element={
              <RutaProtegida>
                <Layout />
              </RutaProtegida>
            }
          >
            <Route path="/gastos" element={<GastosPage />} />
            <Route
              path="/catalogo"
              element={
                <RutaProtegida rolesPermitidos={['MASTER']}>
                  <CatalogoPage />
                </RutaProtegida>
              }
            />
            <Route
              path="/locales"
              element={
                <RutaProtegida rolesPermitidos={['MASTER']}>
                  <LocalesPage />
                </RutaProtegida>
              }
            />
            <Route
              path="/usuarios"
              element={
                <RutaProtegida rolesPermitidos={['MASTER']}>
                  <UsuariosPage />
                </RutaProtegida>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/gastos" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
