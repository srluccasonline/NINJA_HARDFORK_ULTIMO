import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';
import { RootState } from '../store/store';
import { userApi } from '../services/api';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Save, Download, Database, Eye, EyeOff, UserCog, CheckCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '../services/supabase';
import { setUser } from '../store/authSlice';

export const Settings: React.FC = () => {
  const { user, session } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  // Profile State
  const [email, setEmail] = useState(user?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Feedback Modal State
  const [feedbackModal, setFeedbackModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'success' | 'error';
  }>({ isOpen: false, title: '', message: '', type: 'success' });

  const isAdmin = user?.role === 'admin';

  // --- Handlers ---

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const updates: any = {};
      if (email !== user?.email) updates.email = email;
      if (password) updates.password = password;

      if (Object.keys(updates).length === 0) {
        setFeedbackModal({
          isOpen: true,
          title: 'Atenção',
          message: 'Nenhuma alteração detectada.',
          type: 'error'
        });
        return;
      }

      const { data, error } = await supabase.auth.updateUser(updates);

      if (error) throw error;

      setFeedbackModal({
        isOpen: true,
        title: 'Sucesso',
        message: 'Perfil atualizado com sucesso! Se você alterou o email, precisará confirmar no novo endereço.',
        type: 'success'
      });

      // Update redux if email changed and confirmed immediately (depends on supabase config)
      if (data.user && session) {
        dispatch(setUser({
          user: { id: data.user.id, email: data.user.email || '', role: user?.role || 'user' },
          session: session
        }));
      }

      setPassword('');
    } catch (err: any) {
      setFeedbackModal({
        isOpen: true,
        title: 'Erro',
        message: err.message,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    setLoading(true);
    try {
      const blob = await userApi.exportCSV();

      // Formata a data: backup_2023-10-25-14-30.csv
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hour = String(now.getHours()).padStart(2, '0');
      const minute = String(now.getMinutes()).padStart(2, '0');

      const filename = `backup_${year}-${month}-${day}-${hour}-${minute}.csv`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setFeedbackModal({
        isOpen: true,
        title: 'Erro',
        message: `Erro ao gerar backup: ${err.message}`,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const getRuntimeInfo = () => {
    const params = new URLSearchParams(location.search);
    if (params.get('platform') === 'electron') {
      return 'Nativo';
    }
    return `${navigator.userAgent}`;
  };

  return (
    <div className="space-y-8 pb-10">
      <div>
        <h2 className="text-2xl font-bold text-white">Configurações do Sistema</h2>
        <p className="text-zinc-400 text-sm mt-1">Gerencie seu perfil e preferências.</p>
      </div>

      <div className="grid grid-cols-1 gap-8">

        {/* SECTION: PROFILE */}
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <UserCog className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Perfil</h3>
              <p className="text-sm text-zinc-500">Atualize suas credenciais de acesso.</p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-lg">
            <Input
              label="Email de Acesso"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              name="email"
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Nova Senha
              </label>
              <div className="relative group">
                <input
                  type={showPassword ? "text" : "password"}
                  className="block w-full rounded-lg bg-dark-800 border border-dark-600 text-zinc-100 placeholder-zinc-500 focus:border-ninja-500 focus:ring-1 focus:ring-ninja-500 transition-all sm:text-sm py-2.5 pl-3 pr-10"
                  placeholder="Deixe em branco para manter a atual"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="new-password"
                  name="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-white"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" isLoading={loading}>
              <Save className="h-4 w-4 mr-2" />
              Salvar Alterações
            </Button>
          </form>
        </div>

        {/* SECTION: BACKUP (ADMIN ONLY) */}
        {isAdmin && (
          <div className="bg-dark-800 border border-dark-700 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <Database className="h-6 w-6 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Backup de Dados</h3>
                <p className="text-sm text-zinc-500">Exportação completa da base de usuários.</p>
              </div>
            </div>

            <div className="flex items-center justify-between bg-dark-900/50 p-4 rounded-lg border border-dark-700">
              <div>
                <p className="text-sm font-medium text-white">Exportar Usuários (CSV)</p>
                <p className="text-xs text-zinc-500 mt-1">Inclui ID, Email, Status, Data de Criação e Expiração.</p>
              </div>
              <Button variant="secondary" onClick={handleBackup} isLoading={loading}>
                <Download className="h-4 w-4 mr-2" />
                Backup CSV
              </Button>
            </div>
          </div>
        )}

      </div>

      {/* Runtime Info Section */}
      <div className="pt-8 border-t border-dark-800 text-center opacity-30 hover:opacity-100 transition-opacity select-text cursor-default">
        <p className="text-[10px] text-zinc-500 font-mono break-all">
          Runtime: {getRuntimeInfo()}
        </p>
      </div>

      {/* --- MODAL: FEEDBACK --- */}
      <Modal
        isOpen={feedbackModal.isOpen}
        onClose={() => setFeedbackModal(prev => ({ ...prev, isOpen: false }))}
        title={feedbackModal.title}
        maxWidth="sm"
        footer={
          <Button onClick={() => setFeedbackModal(prev => ({ ...prev, isOpen: false }))}>
            OK
          </Button>
        }
      >
        <div className="flex flex-col items-center text-center gap-4">
          <div className={`h-12 w-12 rounded-full flex items-center justify-center ${feedbackModal.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
            {feedbackModal.type === 'success' ? <CheckCircle className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
          </div>
          <p className="text-zinc-300">{feedbackModal.message}</p>
        </div>
      </Modal>

    </div>
  );
};