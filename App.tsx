import React, { useEffect, useRef } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { supabase } from './services/supabase';
import { setUser, logout } from './store/authSlice';
import { getUserRole } from './services/api';
import { RootState } from './store/store';

// Páginas
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Profiles } from './pages/Profiles';
import { UsersPage } from './pages/Users';
import { Proxies } from './pages/Proxies';
import { Settings } from './pages/Settings';
import { TwoFactor } from './pages/TwoFactor';
import { OutdatedVersion } from './pages/OutdatedVersion';
import { Maintenance } from './pages/Maintenance';
import { VERSAO_MINIMA } from './version';

// Componentes
import { Layout } from './components/Layout';
import { PrivateRoute } from './components/PrivateRoute';

const App: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  // Pegamos o user e session do Redux para monitorar mudanças
  const { user, session } = useSelector((state: RootState) => state.auth);

  // Verificação de Versão (DESATIVADA DURANTE MANUTENÇÃO)
  const isOutdated = false;

  // Referência para o canal de broadcast (para limpar depois)
  const channelRef = useRef<any>(null);

  // Guard para evitar loop infinito de logout
  const isLoggingOut = useRef(false);

  // =================================================================
  // 1. FUNÇÃO DE EMERGÊNCIA (KILL SWITCH)
  // =================================================================
  const performEmergencyLogout = async () => {
    // Se já estiver deslogando, aborta para evitar loop
    if (isLoggingOut.current) return;
    isLoggingOut.current = true;

    console.warn("🚨 CONFLITO DE SESSÃO DETECTADO! ENCERRANDO TUDO...");

    // 1. Manda o Electron matar todos os processos (Chrome/Playwright)
    if (window.electronAPI?.killAllApps) {
      try {
        await window.electronAPI.killAllApps();
        console.log("✅ Kill Switch executado com sucesso.");
      } catch (error) {
        console.error("Erro no Kill Switch:", error);
      }
    }

    // 2. Limpa o estado local (Redux)
    dispatch(logout());

    // 3. Força logout no Supabase (limpa LocalStorage)
    await supabase.auth.signOut().catch(() => { });

    // 4. Redireciona para login
    navigate('/login');

    // Opcional: Resetar flag após um tempo se o componente não desmontar (segurança)
    setTimeout(() => {
      isLoggingOut.current = false;
    }, 2000);
  };

  // =================================================================
  // 2. REALTIME BROADCAST ("REI DA MONTANHA")
  // =================================================================
  useEffect(() => {
    // Só conecta se estiver logado
    if (!user || !session) return;

    // Nome do canal único para este ID de usuário
    const channelName = `session_control:${user.id}`;

    // Se já existe conexão, não recria
    if (channelRef.current) supabase.removeChannel(channelRef.current);

    const channel = supabase.channel(channelName);

    channel
      .on('broadcast', { event: 'new_device_login' }, (payload) => {
        // Recebemos um aviso que alguém logou nesta conta.
        console.log("📡 Alerta de Login Recebido:", payload);

        // Se o Token da sessão nova for DIFERENTE do meu token atual...
        if (payload.payload.token !== session.access_token) {
          // ...significa que EU sou a sessão antiga. Devo sair imediatamente.
          performEmergencyLogout();
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Assim que conecto, grito para todos (inclusive eu mesmo):
          // "ESTE É O MEU TOKEN ATUAL!"
          await channel.send({
            type: 'broadcast',
            event: 'new_device_login',
            payload: { token: session.access_token }
          });
        }
      });

    channelRef.current = channel;

    // Limpeza ao sair
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
    };
  }, [user?.id, session?.access_token]); // Recria apenas se o usuário ou token mudar


  // =================================================================
  // 3. VERIFICAÇÃO INICIAL E LISTENER PADRÃO
  // =================================================================
  useEffect(() => {
    // Check inicial ao carregar a página (F5)
    const checkSession = async () => {
      try {
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();

        if (error) throw error;

        if (currentSession) {
          // Login Otimista (Carrega UI rápido)
          dispatch(setUser({
            user: { id: currentSession.user.id, email: currentSession.user.email || '', role: 'user' },
            session: currentSession
          }));

          // Busca Role Real em background
          getUserRole(currentSession.user.id).then(role => {
            if (role !== 'user') {
              dispatch(setUser({
                user: { id: currentSession.user.id, email: currentSession.user.email || '', role },
                session: currentSession
              }));
            }
          });
        }
      } catch (err: any) {
        console.error("Erro de sessão inicial:", err.message);
        if (err.message && (err.message.includes('refresh_token_not_found') || err.message.includes('Invalid Refresh Token'))) {
          performEmergencyLogout();
        }
      }
    };

    checkSession();

    // Listener de Eventos do Auth (Fallback de segurança)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      console.log("Auth Event:", event);

      // Eventos críticos que exigem logout imediato
      const eventName = event as string;
      if (eventName === 'SIGNED_OUT' || eventName === 'TOKEN_REFRESH_REVOKED' || eventName === 'USER_DELETED') {
        performEmergencyLogout();
        return;
      }

      // Atualização de sessão normal (Refresh Token ou Login)
      if (currentSession) {
        const currentRole = currentSession.user.user_metadata?.role || 'user';

        // Só atualiza Redux se necessário para evitar loops
        dispatch(setUser({
          user: { id: currentSession.user.id, email: currentSession.user.email || '', role: currentRole },
          session: currentSession
        }));

        if (event === 'SIGNED_IN') {
          // Busca role atualizada no login
          getUserRole(currentSession.user.id).then(role => {
            dispatch(setUser({
              user: { id: currentSession.user.id, email: currentSession.user.email || '', role },
              session: currentSession
            }));
          });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [dispatch]);

  return <Maintenance />;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Protected Routes */}
      <Route path="/" element={
        <PrivateRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </PrivateRoute>
      } />

      <Route path="/users" element={
        <PrivateRoute>
          <Layout>
            <UsersPage />
          </Layout>
        </PrivateRoute>
      } />

      <Route path="/proxies" element={
        <PrivateRoute>
          <Layout>
            <Proxies />
          </Layout>
        </PrivateRoute>
      } />

      <Route path="/profiles" element={
        <PrivateRoute>
          <Layout>
            <Profiles />
          </Layout>
        </PrivateRoute>
      } />

      <Route path="/2fa" element={
        <PrivateRoute>
          <Layout>
            <TwoFactor />
          </Layout>
        </PrivateRoute>
      } />

      <Route path="/settings" element={
        <PrivateRoute>
          <Layout>
            <Settings />
          </Layout>
        </PrivateRoute>
      } />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;