import React, { useEffect, useState } from 'react';
import { twoFactorApi } from '../services/api';
import { OtpAccount } from '../types';
import { supabase } from '../services/supabase';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import {
  Shield, Plus, Copy, Clock, Trash2, KeyRound, AlertTriangle, RefreshCw
} from 'lucide-react';
import { TOTP } from 'otpauth';

export const TwoFactor: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);

  // Data State
  const [accounts, setAccounts] = useState<OtpAccount[]>([]);
  const [codes, setCodes] = useState<Record<string, { code: string; remaining: number }>>({});
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<OtpAccount | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    provider_name: '',
    otp_secret: ''
  });

  // Check Admin Role
  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return;
      // Try to check profile role. If not accessible or not admin, stats default false.
      try {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (data && data.role === 'admin') {
          setIsAdmin(true);
        }
      } catch (err) {
        console.warn('Could not verify admin role', err);
      }
    };
    checkAdmin();
  }, [user]);

  // Initial Load
  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const data = await twoFactorApi.list();
      setAccounts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // OTP Calculation Loop
  useEffect(() => {
    const calculate = () => {
      const newCodes: Record<string, { code: string; remaining: number }> = {};
      const now = Date.now();
      const period = 30;

      accounts.forEach(acc => {
        try {
          // Remove spaces from secret just in case
          const secret = acc.otp_secret.replace(/\s+/g, '');

          const totp = new TOTP({
            secret: secret,
            algorithm: 'SHA1',
            digits: 6,
            period: period
          });

          const code = totp.generate();
          const remaining = period - (Math.floor(now / 1000) % period);

          newCodes[acc.id] = { code, remaining };
        } catch (e) {
          console.error(`Invalid secret for ${acc.provider_name}`, e);
          newCodes[acc.id] = { code: 'ERROR', remaining: 0 };
        }
      });
      setCodes(newCodes);
    };

    // Calculate immediately then interval
    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [accounts]);

  // Actions
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newAccount = await twoFactorApi.create(formData);
      // Optimistically add or re-fetch
      setAccounts(prev => [...prev, newAccount]);
      setIsAddOpen(false);
      setFormData({ provider_name: '', otp_secret: '' });
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!accountToDelete) return;
    setLoading(true);
    try {
      await twoFactorApi.delete(accountToDelete.id);
      setAccounts(prev => prev.filter(a => a.id !== accountToDelete.id));
      setIsDeleteOpen(false);
      setAccountToDelete(null);
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could show a toast here
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">2FA Compartilhado</h2>
          <p className="text-zinc-400 text-sm mt-1">
            Códigos de autenticação gerados em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={fetchAccounts} isLoading={loading} title="Atualizar Lista">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>

          {isAdmin && (
            <Button onClick={() => setIsAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Chave
            </Button>
          )}
        </div>
      </div>

      {/* Grid of OTP Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {accounts.map(acc => {
          const info = codes[acc.id] || { code: '...', remaining: 30 };
          const isExpiring = info.remaining <= 5;

          return (
            <div key={acc.id} className="bg-dark-800 border border-dark-700 rounded-xl p-6 relative group overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2 text-zinc-400">
                  <Shield className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wider">{acc.provider_name}</span>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => { setAccountToDelete(acc); setIsDeleteOpen(true); }}
                    className="p-1.5 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                    title="Remover"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex flex-col items-center justify-center my-2">
                <div
                  onClick={() => copyToClipboard(info.code)}
                  className="text-4xl font-mono font-bold text-white tracking-widest cursor-pointer hover:text-ninja-400 transition-colors select-none"
                  title="Clique para copiar"
                >
                  {info.code.match(/.{1,3}/g)?.join(' ') || info.code}
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs font-medium text-zinc-500">
                  <Copy className="h-3 w-3" />
                  Clique para copiar
                </div>
              </div>

              {/* Countdown Bar */}
              <div className="absolute bottom-0 left-0 w-full h-1.5 bg-dark-900">
                <div
                  className={`h-full transition-all duration-1000 ease-linear ${isExpiring ? 'bg-red-500' : 'bg-ninja-500'}`}
                  style={{ width: `${(info.remaining / 30) * 100}%` }}
                />
              </div>

              <div className="absolute bottom-3 right-3 flex items-center gap-1 text-[10px] text-zinc-500 font-mono bg-dark-900/80 px-1.5 py-0.5 rounded">
                <Clock className="h-3 w-3" />
                {info.remaining}s
              </div>
            </div>
          );
        })}

        {accounts.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-dark-700 rounded-xl">
            <KeyRound className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
            <p className="text-zinc-500">Nenhuma conta 2FA configurada.</p>
          </div>
        )}
      </div>

      {/* --- ADD MODAL --- */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Adicionar Chave 2FA"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsAddOpen(false)}>Cancelar</Button>
            <Button onClick={handleAdd} isLoading={loading}>Adicionar</Button>
          </>
        }
      >
        <form className="space-y-4">
          <Input
            label="Nome do Provedor"
            placeholder="Ex: Facebook, Google, Amazon..."
            value={formData.provider_name}
            onChange={e => setFormData({ ...formData, provider_name: e.target.value })}
          />
          <Input
            label="Chave Secreta (Secret)"
            placeholder="JBSWY3DPEHPK3PXP..."
            value={formData.otp_secret}
            onChange={e => setFormData({ ...formData, otp_secret: e.target.value })}
          />
          <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg text-xs text-amber-500 flex gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <p>Certifique-se de que a chave secreta está correta. Chaves inválidas gerarão códigos errados.</p>
          </div>
        </form>
      </Modal>

      {/* --- DELETE MODAL --- */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Remover Chave"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete} isLoading={loading}>Confirmar</Button>
          </>
        }
      >
        <div className="text-center py-4">
          <Trash2 className="h-12 w-12 text-red-500 mx-auto mb-3" />
          <p className="text-zinc-300">
            Remover a chave de <strong>{accountToDelete?.provider_name}</strong>?
          </p>
          <p className="text-xs text-zinc-500 mt-1">Essa ação é irreversível.</p>
        </div>
      </Modal>
    </div>
  );
};