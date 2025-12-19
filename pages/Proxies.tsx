import React, { useEffect, useState } from 'react';
import { proxyApi } from '../services/api';
import { ProxyItem, UserAgent } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { 
  Network, Plus, Trash2, RefreshCcw, Server, Globe, Shield, AlertCircle, Edit2, Power
} from 'lucide-react';

export const Proxies: React.FC = () => {
  const [proxies, setProxies] = useState<ProxyItem[]>([]);
  const [userAgents, setUserAgents] = useState<UserAgent[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  
  // Selection States
  const [proxyToDelete, setProxyToDelete] = useState<string | null>(null);
  const [editingProxy, setEditingProxy] = useState<ProxyItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: '',
    username: '',
    password: '',
    protocol: 'http',
    user_agent_id: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [proxiesData, uasData] = await Promise.all([
        proxyApi.list(),
        proxyApi.getUserAgents()
      ]);
      setProxies(proxiesData);
      setUserAgents(uasData);
    } catch (error) {
      console.error(error);
      alert('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingProxy(null);
    setFormData({
      name: '',
      host: '',
      port: '',
      username: '',
      password: '',
      protocol: 'http',
      user_agent_id: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (proxy: ProxyItem) => {
    setEditingProxy(proxy);
    setFormData({
      name: proxy.name,
      host: proxy.host,
      port: proxy.port.toString(),
      username: proxy.username || '',
      password: proxy.password || '',
      protocol: proxy.protocol,
      user_agent_id: proxy.user_agent_id
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        port: parseInt(formData.port),
        protocol: formData.protocol as 'http' | 'https' | 'socks5'
      };

      if (editingProxy) {
        // Update Logic
        await proxyApi.update({
          id: editingProxy.id,
          ...payload
        });
      } else {
        // Create Logic
        await proxyApi.create(payload);
      }

      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      alert(error.message || 'Erro ao salvar proxy');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (proxy: ProxyItem) => {
    const newStatus = proxy.status === 'active' ? 'dead' : 'active';
    // Otimistic UI update
    setProxies(prev => prev.map(p => p.id === proxy.id ? { ...p, status: newStatus as any } : p));
    
    try {
      await proxyApi.update({
        id: proxy.id,
        status: newStatus
      });
      // Confirma dados do servidor em background
      fetchData();
    } catch (error: any) {
      alert('Erro ao alterar status');
      fetchData(); // Reverte em caso de erro
    }
  };

  const handleDelete = async () => {
    if (!proxyToDelete) return;
    setLoading(true);
    try {
      await proxyApi.delete(proxyToDelete);
      setIsDeleteOpen(false);
      setProxyToDelete(null);
      fetchData();
    } catch (error: any) {
      alert(error.message || 'Erro ao deletar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Gerenciar Proxies</h2>
          <p className="text-zinc-400 text-sm mt-1">
            Conexões de saída e Fingerprints
          </p>
        </div>
        <Button onClick={handleOpenCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Proxy
        </Button>
      </div>

      <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-zinc-400">
            <thead className="text-xs text-zinc-500 uppercase bg-dark-900/50 border-b border-dark-700">
              <tr>
                <th className="px-6 py-4">Nome</th>
                <th className="px-6 py-4">Endpoint</th>
                <th className="px-6 py-4">Protocolo</th>
                <th className="px-6 py-4">Fingerprint / Browser</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {loading && proxies.length === 0 ? (
                 <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                        <RefreshCcw className="h-6 w-6 animate-spin mx-auto mb-2 text-ninja-500" />
                        Carregando...
                    </td>
                 </tr>
              ) : proxies.map((proxy) => (
                <tr key={proxy.id} className="hover:bg-dark-700/50 transition-colors group">
                  <td className="px-6 py-4 font-medium text-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-dark-700 rounded-lg">
                            <Server className="h-4 w-4 text-ninja-500" />
                        </div>
                        {proxy.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-zinc-300">
                    {proxy.host}:{proxy.port}
                  </td>
                  <td className="px-6 py-4 uppercase text-xs font-bold tracking-wider">
                    {proxy.protocol}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-zinc-300">
                        <Globe className="h-3 w-3 text-blue-400" />
                        {proxy.ua_info ? (
                            <span>{proxy.ua_info.os} • {proxy.ua_info.browser} {proxy.ua_info.version}</span>
                        ) : (
                            <span className="text-zinc-600 italic">Desconhecido</span>
                        )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                     <Badge variant={proxy.status === 'active' ? 'success' : 'danger'}>
                        {proxy.status === 'active' ? 'Ativo' : proxy.status === 'dead' ? 'Dead' : 'Offline'}
                     </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => handleToggleStatus(proxy)}
                            className={`p-1.5 rounded transition-colors ${
                                proxy.status === 'active' 
                                ? 'hover:bg-red-500/10 text-emerald-500 hover:text-red-500' 
                                : 'hover:bg-emerald-500/10 text-red-500 hover:text-emerald-500'
                            }`}
                            title={proxy.status === 'active' ? 'Desativar (Dead)' : 'Ativar'}
                        >
                            <Power className="h-4 w-4" />
                        </button>
                        
                        <button 
                            onClick={() => handleOpenEdit(proxy)}
                            className="p-1.5 hover:bg-ninja-600/10 text-zinc-400 hover:text-ninja-500 rounded transition-colors"
                            title="Editar"
                        >
                            <Edit2 className="h-4 w-4" />
                        </button>
                        
                        <button 
                            onClick={() => { setProxyToDelete(proxy.id); setIsDeleteOpen(true); }}
                            className="p-1.5 hover:bg-red-500/10 text-zinc-400 hover:text-red-500 rounded transition-colors"
                            title="Remover"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!loading && proxies.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                        Nenhum proxy cadastrado.
                    </td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProxy ? "Editar Proxy" : "Novo Proxy"}
        footer={
           <>
             <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
             <Button onClick={handleSave} isLoading={loading}>
                {editingProxy ? "Salvar Alterações" : "Criar Proxy"}
             </Button>
           </>
        }
      >
        <form className="space-y-4">
            <Input 
                label="Nome Identificador"
                placeholder="Ex: Proxy Residencial SP"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
            />
            
            <div className="grid grid-cols-2 gap-4">
                <Input 
                    label="IP / Host"
                    placeholder="192.168.0.1"
                    value={formData.host}
                    onChange={e => setFormData({...formData, host: e.target.value})}
                />
                <Input 
                    label="Porta"
                    type="number"
                    placeholder="8080"
                    value={formData.port}
                    onChange={e => setFormData({...formData, port: e.target.value})}
                />
            </div>

            <div className="space-y-1.5">
                <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">Protocolo</label>
                <select 
                    className="block w-full rounded-lg bg-dark-800 border border-dark-600 text-zinc-100 focus:border-ninja-500 focus:ring-1 focus:ring-ninja-500 py-2.5 px-3 sm:text-sm"
                    value={formData.protocol}
                    onChange={e => setFormData({...formData, protocol: e.target.value})}
                >
                    <option value="http">HTTP</option>
                    <option value="https">HTTPS</option>
                    <option value="socks5">SOCKS5</option>
                </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Input 
                    label="Usuário (Opcional)"
                    placeholder="user123"
                    value={formData.username}
                    onChange={e => setFormData({...formData, username: e.target.value})}
                />
                <Input 
                    label="Senha (Opcional)"
                    type="password"
                    placeholder="*****"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                />
            </div>

            <div className="space-y-2 pt-2 border-t border-dark-700 mt-2">
                <label className="block text-xs font-medium text-ninja-500 uppercase tracking-wider flex items-center gap-2">
                    <Shield className="h-3 w-3" />
                    Fingerprint / User Agent (Obrigatório)
                </label>
                <select 
                    className="block w-full rounded-lg bg-dark-900 border border-dark-600 text-zinc-100 focus:border-ninja-500 focus:ring-1 focus:ring-ninja-500 py-2.5 px-3 sm:text-sm"
                    value={formData.user_agent_id}
                    required
                    onChange={e => setFormData({...formData, user_agent_id: e.target.value})}
                >
                    <option value="">Selecione um fingerprint...</option>
                    {userAgents.map(ua => (
                        <option key={ua.id} value={ua.id}>
                            {ua.os} - {ua.browser} {ua.version}
                        </option>
                    ))}
                </select>
                <p className="text-[10px] text-zinc-500">
                    O sistema utilizará este fingerprint para mascarar a conexão do proxy.
                </p>
            </div>
        </form>
      </Modal>

      {/* DELETE MODAL */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Remover Proxy"
        footer={
           <>
             <Button variant="ghost" onClick={() => setIsDeleteOpen(false)}>Cancelar</Button>
             <Button variant="danger" onClick={handleDelete} isLoading={loading}>Confirmar</Button>
           </>
        }
      >
         <div className="text-center py-4">
             <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
             <p className="text-zinc-300">Deseja realmente remover este proxy?</p>
             <p className="text-xs text-zinc-500 mt-1">Perfis vinculados a ele podem perder conexão.</p>
         </div>
      </Modal>
    </div>
  );
};