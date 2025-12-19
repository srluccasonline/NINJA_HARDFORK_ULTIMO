import React, { useEffect, useState, useCallback } from 'react';
import { userApi } from '../services/api';
import { AdminUser, ApiMeta } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { 
  Plus, Search, Edit2, Trash2, Ban, 
  ChevronLeft, ChevronRight, AlertTriangle,
  RefreshCcw, Eye, EyeOff, Dices
} from 'lucide-react';

export const UsersPage: React.FC = () => {
  // State Data
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [meta, setMeta] = useState<ApiMeta>({ page: 1, per_page: 10, total: 0 });
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  // Filter State
  const [searchTerm, setSearchTerm] = useState('');

  // Modals State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isBanOpen, setIsBanOpen] = useState(false);
  
  // UI State
  const [showPassword, setShowPassword] = useState(false);

  // Form/Action State
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    expires_at: ''
  });
  const [banDuration, setBanDuration] = useState('24h');

  // --- Helpers ---
  const generatePassword = () => {
    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
    let retVal = "";
    for (let i = 0, n = charset.length; i < 12; ++i) {
        retVal += charset.charAt(Math.floor(Math.random() * n));
    }
    setFormData(prev => ({ ...prev, password: retVal }));
  };

  const generateDefaultDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30); // Hoje + 30 dias
    return date.toISOString().split('T')[0];
  };

  const generateRandomEmail = () => {
    const randomSuffix = Math.floor(Math.random() * 90000) + 10000;
    return `user${randomSuffix}@ninjabr.local`;
  };

  // --- Fetch Data ---
  const fetchUsers = useCallback(async (page = 1, search = searchTerm) => {
    setLoading(true);
    setError(null);
    try {
      const res = await userApi.list(page, meta.per_page, search);
      
      // Removed the filter that hid admins:
      // const filteredUsers = res.data.filter(u => u.role !== 'admin');
      
      setUsers(res.data);
      setMeta(res.meta);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [meta.per_page, searchTerm]);

  // Initial load
  useEffect(() => {
    fetchUsers(1);
  }, []); // Run once on mount

  // Handle Search Input
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(1, searchTerm); // Reset to page 1 on search
  };

  const handleRefresh = () => {
    fetchUsers(meta.page, searchTerm);
  };

  // --- Handlers ---
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(new Set(users.map(u => u.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const openCreate = () => {
    setFormData({
      email: '',
      password: '',
      expires_at: ''
    });
    setShowPassword(false);
    setIsCreateOpen(true);
  };

  const openEdit = (user: AdminUser) => {
    // Segurança extra: não permitir editar admin mesmo se passar pelo filtro
    if (user.role === 'admin') return;
    
    setCurrentUser(user);
    setFormData({
      email: user.email || '',
      password: '', // Senha em branco no edit, pois não dá pra recuperar
      expires_at: user.expires_at ? new Date(user.expires_at).toISOString().split('T')[0] : ''
    });
    setShowPassword(false);
    setIsEditOpen(true);
  };

  // --- API Actions ---
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Regras de Negócio
      const finalEmail = formData.email.trim() === '' ? generateRandomEmail() : formData.email;
      const finalExpiresAt = formData.expires_at === '' ? generateDefaultDate() : formData.expires_at;

      if (!formData.password) {
        throw new Error('A senha é obrigatória.');
      }

      await userApi.create({
        email: finalEmail,
        password: formData.password,
        expires_at: finalExpiresAt
      });

      setIsCreateOpen(false);
      fetchUsers(1, searchTerm); 
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setLoading(true);
    try {
      await userApi.update(currentUser.id, {
        email: formData.email,
        password: formData.password || undefined, // Só envia se tiver algo escrito
        expires_at: formData.expires_at
      });
      setIsEditOpen(false);
      setCurrentUser(null);
      fetchUsers(meta.page, searchTerm);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      const idsToDelete = currentUser ? [currentUser.id] : Array.from(selectedIds);
      await userApi.delete(idsToDelete);
      setIsDeleteOpen(false);
      setSelectedIds(new Set());
      setCurrentUser(null);
      fetchUsers(meta.page, searchTerm);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBan = async () => {
    setLoading(true);
    try {
      const idsToBan = currentUser ? [currentUser.id] : Array.from(selectedIds);
      await userApi.ban(idsToBan, banDuration);
      setIsBanOpen(false);
      setSelectedIds(new Set());
      setCurrentUser(null);
      fetchUsers(meta.page, searchTerm);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Helper to check status ---
  const getUserStatus = (user: AdminUser) => {
    if (user.banned_until && new Date(user.banned_until) > new Date()) return 'banned';
    if (user.expires_at && new Date(user.expires_at) < new Date()) return 'expired';
    return 'active';
  };

  // Calculate Total Pages
  const totalPages = Math.ceil(meta.total / meta.per_page) || 1;

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white">Gerenciar Usuários</h2>
            <p className="text-zinc-400 text-sm mt-1">
              Lista completa de acessos do sistema
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Usuário
            </Button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-4 flex flex-col md:flex-row justify-between gap-4">
          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <Input 
              placeholder="Buscar por email..." 
              icon={Search} 
              className="bg-dark-900"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </form>

          <div className="flex gap-2 overflow-x-auto">
             <Button variant="secondary" onClick={handleRefresh} disabled={loading} title="Recarregar Lista">
              <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>

            {selectedIds.size > 0 && (
              <>
                <Button variant="danger" onClick={() => setIsDeleteOpen(true)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  ({selectedIds.size})
                </Button>
                <Button variant="secondary" onClick={() => setIsBanOpen(true)}>
                  <Ban className="h-4 w-4 mr-2" />
                  ({selectedIds.size})
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* List Container */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
        {/* Loading / Error */}
        {error && (
          <div className="p-4 bg-red-500/10 border-b border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-zinc-400">
            <thead className="text-xs text-zinc-500 uppercase bg-dark-900/50 border-b border-dark-700">
              <tr>
                <th className="p-4 w-4">
                  <input 
                    type="checkbox" 
                    className="rounded bg-dark-700 border-dark-600 text-ninja-600 focus:ring-ninja-600 focus:ring-offset-dark-800"
                    onChange={handleSelectAll}
                    checked={users.length > 0 && selectedIds.size === users.length}
                  />
                </th>
                <th className="px-6 py-4">Usuário / Email</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Criado em</th>
                <th className="px-6 py-4">Expira em</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {loading && users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                     <div className="flex flex-col items-center gap-2">
                        <RefreshCcw className="h-6 w-6 animate-spin text-ninja-500" />
                        <p>Carregando dados...</p>
                     </div>
                  </td>
                </tr>
              ) : users.length === 0 && !loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              ) : users.map((u) => {
                const status = getUserStatus(u);
                const displayEmail = u.email || (u as any).raw_user_meta_data?.email || (u as any).user_metadata?.email || "Email Indisponível";

                return (
                  <tr key={u.id} className="hover:bg-dark-700/50 transition-colors group">
                    <td className="p-4">
                      <input 
                        type="checkbox" 
                        className="rounded bg-dark-700 border-dark-600 text-ninja-600 focus:ring-ninja-600 focus:ring-offset-dark-800"
                        checked={selectedIds.has(u.id)}
                        onChange={() => handleSelectOne(u.id)}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img 
                          src={`https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${displayEmail}`}
                          className="h-10 w-10 rounded-full bg-dark-900 border border-dark-700"
                          alt="Avatar"
                        />
                        <div className="flex flex-col">
                            <span className="text-white font-medium">{displayEmail}</span>
                            {u.username && u.username !== displayEmail.split('@')[0] && (
                                <span className="text-xs text-zinc-500">Nick: {u.username}</span>
                            )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {status === 'banned' ? (
                        <Badge variant="danger">Banido</Badge>
                      ) : status === 'expired' ? (
                        <Badge variant="warning">Expirado</Badge>
                      ) : (
                        <Badge variant="success">Ativo</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {new Date(u.created_at).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4">
                      {u.expires_at 
                        ? new Date(u.expires_at).toLocaleDateString('pt-BR') 
                        : <span className="text-zinc-600">-</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => openEdit(u)}
                          className="p-1.5 hover:bg-ninja-600/10 text-zinc-400 hover:text-ninja-500 rounded transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => { setCurrentUser(u); setIsBanOpen(true); }}
                          className="p-1.5 hover:bg-amber-500/10 text-zinc-400 hover:text-amber-500 rounded transition-colors"
                          title="Banir"
                        >
                          <Ban className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => { setCurrentUser(u); setIsDeleteOpen(true); }}
                          className="p-1.5 hover:bg-red-500/10 text-zinc-400 hover:text-red-500 rounded transition-colors"
                          title="Deletar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-dark-900/50 border-t border-dark-700 px-6 py-4 flex items-center justify-between">
          <span className="text-sm text-zinc-500">
            Página {meta.page} de {totalPages} ({meta.total} registros)
          </span>
          <div className="flex gap-2">
            <Button 
              variant="secondary" 
              className="px-3 py-1 text-xs"
              disabled={meta.page === 1 || loading}
              onClick={() => fetchUsers(meta.page - 1, searchTerm)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <Button 
              variant="secondary" 
              className="px-3 py-1 text-xs"
              disabled={meta.page >= totalPages || loading}
              onClick={() => fetchUsers(meta.page + 1, searchTerm)}
            >
              Próxima <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Novo Usuário"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} isLoading={loading}>Criar Usuário</Button>
          </>
        }
      >
        <form id="create-form" onSubmit={handleCreate} className="space-y-5">
          <div className="bg-ninja-500/5 border border-ninja-500/20 p-3 rounded-lg text-xs text-ninja-200 mb-2">
            <p>Se o email ficar vazio, será gerado um <strong>@ninjabr.local</strong> automaticamente.</p>
            <p>Se a data ficar vazia, será definido <strong>30 dias</strong> de acesso.</p>
          </div>

          <Input 
            label="Email (Opcional)" 
            placeholder="Ex: cliente@gmail.com" 
            value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})}
          />
          
          <div className="space-y-1.5">
             <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Senha (Obrigatória)
             </label>
             <div className="flex gap-2">
                <div className="relative flex-1 group">
                    <input
                        type={showPassword ? "text" : "password"}
                        className="block w-full rounded-lg bg-dark-800 border border-dark-600 text-zinc-100 placeholder-zinc-500 focus:border-ninja-500 focus:ring-1 focus:ring-ninja-500 transition-all sm:text-sm py-2.5 pl-3 pr-10"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                        required
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-white"
                        tabIndex={-1}
                    >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
                <Button type="button" variant="secondary" onClick={generatePassword} title="Gerar senha aleatória">
                    <Dices className="h-4 w-4" />
                </Button>
             </div>
          </div>

          <Input 
            label="Expira em (Opcional)" 
            type="date"
            value={formData.expires_at}
            onChange={e => setFormData({...formData, expires_at: e.target.value})}
          />
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Editar Usuário"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdate} isLoading={loading}>Salvar Alterações</Button>
          </>
        }
      >
        <form className="space-y-5">
          <Input 
            label="Email" 
            value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})}
          />
          
          <div className="space-y-1.5">
             <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Nova Senha (Opcional)
             </label>
             <div className="flex gap-2">
                <div className="relative flex-1 group">
                    <input
                        type={showPassword ? "text" : "password"}
                        className="block w-full rounded-lg bg-dark-800 border border-dark-600 text-zinc-100 placeholder-zinc-500 focus:border-ninja-500 focus:ring-1 focus:ring-ninja-500 transition-all sm:text-sm py-2.5 pl-3 pr-10"
                        placeholder="Deixe vazio para manter a atual"
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                    />
                     <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-white"
                        tabIndex={-1}
                    >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                </div>
                <Button type="button" variant="secondary" onClick={generatePassword} title="Gerar senha aleatória">
                    <Dices className="h-4 w-4" />
                </Button>
             </div>
             <p className="text-[10px] text-zinc-500">A senha antiga não pode ser recuperada por segurança, apenas redefinida.</p>
          </div>

          <Input 
            label="Expira em" 
            type="date"
            value={formData.expires_at}
            onChange={e => setFormData({...formData, expires_at: e.target.value})}
          />
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Confirmar Exclusão"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete} isLoading={loading}>
              Confirmar Exclusão
            </Button>
          </>
        }
      >
        <div className="text-center py-4">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-3" />
          <p className="text-zinc-300">
            Você tem certeza que deseja deletar 
            <strong className="text-white"> {currentUser ? (currentUser.email) : `${selectedIds.size} usuários`}</strong>?
          </p>
          <p className="text-sm text-zinc-500 mt-2">Esta ação é irreversível.</p>
        </div>
      </Modal>

      {/* Ban Modal */}
      <Modal
        isOpen={isBanOpen}
        onClose={() => setIsBanOpen(false)}
        title="Gerenciar Banimento"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsBanOpen(false)}>Cancelar</Button>
            <Button variant="danger" onClick={handleBan} isLoading={loading}>
              Aplicar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-zinc-400">
            Selecione a duração do banimento para 
            {currentUser ? <strong> {currentUser.email}</strong> : ` ${selectedIds.size} usuários`}.
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: '24 Horas', val: '24h' },
              { label: '7 Dias', val: '168h' },
              { label: '30 Dias', val: '720h' },
              { label: 'Permanente', val: '876600h' }, // 100 years
              { label: 'Remover Ban', val: 'none' }
            ].map((opt) => (
              <button
                key={opt.val}
                onClick={() => setBanDuration(opt.val)}
                className={`
                  p-3 rounded-lg border text-sm font-medium transition-all
                  ${banDuration === opt.val 
                    ? 'bg-ninja-600 border-ninja-500 text-white' 
                    : 'bg-dark-700 border-dark-600 text-zinc-300 hover:bg-dark-600'}
                `}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};