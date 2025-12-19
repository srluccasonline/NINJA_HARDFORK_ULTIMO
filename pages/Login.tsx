import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { supabase } from '../services/supabase';
import { setLoading, setError, setUser } from '../store/authSlice';
import { RootState } from '../store/store';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { Mail, Lock, AlertCircle, Check } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, user } = useSelector((state: RootState) => state.auth);

  // Redirecionamento automático se já estiver logado
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    dispatch(setLoading(true));

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (data.session && data.user) {
        // OTIMIZAÇÃO: Não esperamos o 'getUserRole' aqui para evitar delay.
        // O App.tsx já tem um listener que atualiza a role em background assim que a sessão é detectada.
        // Definimos 'user' temporariamente para liberar o acesso imediato.
        
        dispatch(setUser({
          user: { id: data.user.id, email: data.user.email || '', role: 'user' },
          session: data.session
        }));
        
        // Redireciona imediatamente
        navigate('/');
      }
    } catch (err: any) {
      dispatch(setError(err.message || 'Falha ao autenticar'));
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-ninja-600/10 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-ninja-600/5 rounded-full blur-[100px]"></div>
      </div>

      <div className="w-full max-w-md bg-dark-800/50 backdrop-blur-xl border border-dark-700 rounded-2xl shadow-2xl p-10 relative z-10">
        
        {/* Header Limpo com Estilo Reflexivo e BR Laranja */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black tracking-tighter select-none drop-shadow-sm">
            <span className="bg-gradient-to-br from-white via-zinc-300 to-zinc-500 bg-clip-text text-transparent">NINJA</span>
            <span className="bg-gradient-to-br from-ninja-400 to-ninja-600 bg-clip-text text-transparent">BR</span>
          </h1>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <Input 
            id="email"
            name="email"
            label="Email" 
            type="email" 
            autoComplete="email"
            placeholder="admin@ninjabr.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={Mail}
            required
          />
          
          <Input 
            id="password"
            name="password"
            label="Senha" 
            type="password" 
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={Lock}
            required
          />

          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 cursor-pointer group">
                <div className="relative">
                <input 
                    type="checkbox" 
                    className="peer sr-only" 
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                />
                <div className="h-4 w-4 rounded border border-dark-600 bg-dark-800 transition-all peer-checked:bg-ninja-600 peer-checked:border-ninja-600 peer-focus:ring-2 peer-focus:ring-ninja-500/50 flex items-center justify-center">
                    <Check className="h-3 w-3 text-white opacity-0 peer-checked:opacity-100" />
                </div>
                </div>
                <span className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors select-none">Lembrar de mim</span>
            </label>
            
            <button type="button" className="text-sm text-ninja-500 hover:text-ninja-400 transition-colors font-medium">
                Esqueceu a senha?
            </button>
          </div>

          <div className="pt-2">
            <Button 
              type="submit" 
              className="w-full" 
              variant="primary"
              isLoading={loading}
            >
              Entrar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};