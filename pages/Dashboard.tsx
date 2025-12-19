import React, { useEffect, useState } from 'react';
import { userApi } from '../services/api';
import { UserStats } from '../types';
import { Users, Activity, Ban, UserX, RefreshCcw } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';
import { useNavigate } from 'react-router-dom';

const StatCard = ({ title, value, icon: Icon, colorClass, bgClass }: any) => (
  <div className="bg-dark-800 border border-dark-700 p-6 rounded-xl relative overflow-hidden group hover:border-dark-600 transition-all">
    <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity`}>
      <Icon className={`h-16 w-16 ${colorClass}`} />
    </div>
    <div className="flex items-center gap-4">
      <div className={`p-3 rounded-lg ${bgClass}`}>
        <Icon className={`h-6 w-6 ${colorClass}`} />
      </div>
      <div>
        <p className="text-sm text-zinc-400 font-medium">{title}</p>
        <h3 className="text-2xl font-bold text-white mt-1">{value}</h3>
      </div>
    </div>
  </div>
);

export const Dashboard: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();

  const [stats, setStats] = useState<UserStats>({
    total_users: 0,
    banned_users: 0,
    expired_users: 0,
    online_users: 0
  });
  const [loading, setLoading] = useState(true);

  // Redireciona usuários comuns para /profiles, pois eles não tem acesso ao dashboard
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/profiles');
    }
  }, [user, navigate]);

  const fetchDashboardData = async () => {
    // Apenas admin carrega dados
    if (!user || user.role !== 'admin') return;

    setLoading(true);
    try {
      const data = await userApi.getStats();
      setStats(data);
    } catch (error) {
      console.error("Erro ao carregar dashboard", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.role === 'admin') {
        fetchDashboardData();
    }
  }, [user]);

  if (user?.role !== 'admin') return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Dashboard Geral</h2>
          <p className="text-sm text-zinc-400 mt-1">Visão geral do sistema NINJABR</p>
        </div>
        <button 
          onClick={fetchDashboardData}
          disabled={loading}
          className="p-2 bg-dark-800 hover:bg-dark-700 border border-dark-700 text-zinc-400 hover:text-white rounded-lg transition-colors"
          title="Atualizar dados"
        >
          <RefreshCcw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total de Usuários */}
        <StatCard 
          title="Total de Usuários" 
          value={loading ? "..." : stats.total_users} 
          icon={Users} 
          colorClass="text-ninja-500"
          bgClass="bg-ninja-600/10"
        />

        {/* Usuários Online */}
        <StatCard 
          title="Usuários Online" 
          value={loading ? "..." : stats.online_users} 
          icon={Activity} 
          colorClass="text-emerald-500"
          bgClass="bg-emerald-500/10"
        />

        {/* Usuários Banidos */}
        <StatCard 
          title="Usuários Banidos" 
          value={loading ? "..." : stats.banned_users} 
          icon={Ban} 
          colorClass="text-red-500"
          bgClass="bg-red-500/10"
        />

        {/* Contas Expiradas */}
        <StatCard 
          title="Contas Expiradas" 
          value={loading ? "..." : stats.expired_users} 
          icon={UserX} 
          colorClass="text-amber-500"
          bgClass="bg-amber-500/10"
        />
      </div>

      {/* Área de Welcome */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl p-8 text-center mt-8">
        <div className="max-w-2xl mx-auto">
          <h3 className="text-xl font-bold text-white mb-2">Bem-vindo ao Painel Administrativo</h3>
          <p className="text-zinc-400">
            Utilize o menu lateral para gerenciar usuários, visualizar perfis e configurar as opções de segurança do sistema.
            Todas as métricas acima são atualizadas em tempo real baseadas no banco de dados.
          </p>
        </div>
      </div>
    </div>
  );
};