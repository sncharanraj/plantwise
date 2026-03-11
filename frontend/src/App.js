import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import PlantDetail from './pages/PlantDetail';
import './index.css';

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', flexDirection:'column', gap:20, background:'var(--bg)' }}>
        <span style={{ fontSize:48 }}>🌻</span>
        <div style={{ width:32, height:32, border:'3px solid var(--border-mid)', borderTopColor:'var(--olive-mid)', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
      </div>
    );
  }
  return (
    <Routes>
      <Route path="/auth" element={!user ? <AuthPage /> : <Navigate to="/" />} />
      <Route path="/" element={user ? <Dashboard /> : <Navigate to="/auth" />} />
      <Route path="/plant/:plantId" element={user ? <PlantDetail /> : <Navigate to="/auth" />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}