import React, { useEffect, useState } from 'react';
import { appManagerApi, proxyApi } from '../services/api';
import { supabase } from '../services/supabase';
import { AppGroup, AppProfile, Tag, ProxyItem } from '../types';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import {
    Folder, Plus, Search, Layers, Play, Globe,
    Monitor, ShieldCheck, RefreshCcw, Tag as TagIcon, Edit2, Trash2, AlertTriangle,
    Activity, Zap, Eye, EyeOff, ChevronDown, ChevronRight, Ban, ShieldAlert, ArrowRightLeft, LogOut, Power, Copy, Bug
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '../store/store';

// Helper Component for Favicon
const AppIcon = ({ url, isRunning }: { url: string, isRunning: boolean }) => {
    const [error, setError] = useState(false);

    // Reset error if url changes
    useEffect(() => {
        setError(false);
    }, [url]);

    if (isRunning) {
        return <Activity className="h-6 w-6" />;
    }

    let domain = '';
    try {
        // Add protocol if missing to parse hostname correctly
        const safeUrl = url.startsWith('http') ? url : `https://${url}`;
        domain = new URL(safeUrl).hostname;
    } catch (e) {
        return <Globe className="h-6 w-6" />;
    }

    if (error || !domain) {
        return <Globe className="h-6 w-6" />;
    }

    return (
        <img
            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
            alt="App Icon"
            className="h-6 w-6 object-contain"
            onError={() => setError(true)}
        />
    );
};

// --- SERVICES HELPERS FOR LAUNCH ---
const APP_MANAGER_URL = 'https://nvukznijjllgyuyrswhy.supabase.co/functions/v1/app-manager';

// 1. Baixa o JSON da sessão da URL assinada (Bucket)
const downloadSessionJson = async (url: string | null) => {
    if (!url) return null;
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Falha ao baixar sessão");
        return await res.json();
    } catch (e) {
        console.warn("Nenhuma sessão anterior válida encontrada ou erro ao baixar:", e);
        return null;
    }
};

// 2. Sobe o JSON novo para a Edge Function
const uploadSessionJson = async (appId: string, sessionData: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    console.log("☁️ Subindo sessão atualizada...");

    await fetch(`${APP_MANAGER_URL}?target=apps&action=save_session&id=${appId}`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            session_data: sessionData,
            hash: Date.now().toString()
        })
    });
};

export const Profiles: React.FC = () => {
    // Redux User State
    const { user } = useSelector((state: RootState) => state.auth);
    const isAdmin = user?.role === 'admin';

    // Data State
    const [groups, setGroups] = useState<AppGroup[]>([]);
    const [apps, setApps] = useState<AppProfile[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [proxies, setProxies] = useState<ProxyItem[]>([]);
    const [loading, setLoading] = useState(false);

    // Execution State
    const [launchingId, setLaunchingId] = useState<string | null>(null);
    const [runningApps, setRunningApps] = useState<string[]>([]);

    // UI State
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAutofillPassword, setShowAutofillPassword] = useState(false);
    const [showAdvancedSelectors, setShowAdvancedSelectors] = useState(false);
    const [showBlockSelectors, setShowBlockSelectors] = useState(false);
    const [showBlockedUrls, setShowBlockedUrls] = useState(false);

    // Modals & Action States
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [isAppModalOpen, setIsAppModalOpen] = useState(false);

    const [editingGroup, setEditingGroup] = useState<AppGroup | null>(null);
    const [editingApp, setEditingApp] = useState<AppProfile | null>(null);

    const [groupToDelete, setGroupToDelete] = useState<AppGroup | null>(null);
    const [appToDelete, setAppToDelete] = useState<AppProfile | null>(null);

    // Forms
    const [groupForm, setGroupForm] = useState({ name: '', tags: [] as string[] });
    const [appForm, setAppForm] = useState({
        name: '',
        start_url: 'https://google.com',
        proxy_id: '',
        is_autofill_enabled: false,
        login: '',
        password: '',
        login_selector: '',
        password_selector: '',
        sync_credentials: false,
        block_selectors_text: '', // Helper to handle array as multiline string
        blocked_urls_text: '' // Helper for blocked URLs
    });

    // Custom Modals State
    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
        isLoading?: boolean;
    }>({ isOpen: false, title: '', message: '', onConfirm: () => { } });

    const [feedbackModal, setFeedbackModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        type: 'success' | 'error';
    }>({ isOpen: false, title: '', message: '', type: 'success' });

    // Load Initial Data
    useEffect(() => {
        loadData();
    }, []);

    // Electron Listener for Closed Apps
    useEffect(() => {
        if (window.electronAPI && window.electronAPI.onAppClosed) {
            window.electronAPI.onAppClosed((_event, closedAppId) => {
                console.log("Electron: App Closed ->", closedAppId);
                setRunningApps((prev) => prev.filter(id => id !== closedAppId));
            });
        }
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Load Groups and Tags first (Accessible to everyone)
            const [groupsData, tagsData] = await Promise.all([
                appManagerApi.getGroups(),
                appManagerApi.getTags(),
            ]);

            setGroups(groupsData);
            setTags(tagsData);

            // 2. Try to load Proxies (Admin Only usually)
            // If it fails (403), we just set empty array and don't crash
            let proxiesData: ProxyItem[] = [];
            try {
                proxiesData = await proxyApi.list();
            } catch (e) {
                console.warn("Não foi possível carregar proxies (provavelmente restrição de permissão)", e);
            }
            setProxies(proxiesData);

            // 3. Try to load Apps
            let appsData: AppProfile[] = [];
            try {
                appsData = await appManagerApi.getApps();
            } catch (e) {
                console.warn("Erro ao carregar lista direta de apps", e);
            }

            // Consolidate Apps: 
            let allApps: AppProfile[] = appsData;
            // If direct list is empty, check nested apps in groups
            if (allApps.length === 0 && groupsData.length > 0) {
                const nestedApps = groupsData.flatMap(g => g.apps || []);
                if (nestedApps.length > 0) {
                    allApps = nestedApps;
                }
            }
            setApps(allApps);

            // Select default group (Ninja) if none selected and still valid
            if (groupsData.length > 0) {
                if (!selectedGroupId || !groupsData.find(g => g.id === selectedGroupId)) {
                    const defaultGroup = groupsData.find(g => g.is_default);
                    if (defaultGroup) setSelectedGroupId(defaultGroup.id);
                    else setSelectedGroupId(groupsData[0].id);
                }
            } else {
                setSelectedGroupId(null);
            }

        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setLoading(false);
        }
    };

    // --- Handlers: Modal Openers ---

    const openCreateGroup = () => {
        setEditingGroup(null);
        setGroupForm({ name: '', tags: [] });
        setIsGroupModalOpen(true);
    };

    const openEditGroup = (e: React.MouseEvent, group: AppGroup) => {
        e.stopPropagation();
        setEditingGroup(group);
        setGroupForm({
            name: group.name,
            tags: group.tags ? group.tags.map(t => t.id) : []
        });
        setIsGroupModalOpen(true);
    };

    const openCreateApp = () => {
        setEditingApp(null);
        setShowAutofillPassword(false);
        setShowAdvancedSelectors(false);
        setShowBlockSelectors(false);
        setShowBlockedUrls(false);
        setAppForm({
            name: '',
            start_url: 'https://google.com',
            proxy_id: '',
            is_autofill_enabled: false,
            login: '',
            password: '',
            login_selector: '',
            password_selector: '',
            sync_credentials: false,
            block_selectors_text: '',
            blocked_urls_text: ''
        });
        setIsAppModalOpen(true);
    };

    const openEditApp = (app: AppProfile) => {
        setEditingApp(app);
        setShowAutofillPassword(false);
        setShowAdvancedSelectors(false);
        setShowBlockSelectors(false);
        setShowBlockedUrls(false);
        setAppForm({
            name: app.name,
            start_url: app.start_url,
            proxy_id: app.proxy_id || '',
            is_autofill_enabled: app.is_autofill_enabled || false,
            login: app.login || '',
            password: app.password || '',
            login_selector: app.login_selector || '',
            password_selector: app.password_selector || '',
            sync_credentials: app.sync_credentials || false,
            // Now mapping directly from string fields
            block_selectors_text: app.ublock_rules || '',
            blocked_urls_text: app.url_blocks || ''
        });
        setIsAppModalOpen(true);
    };

    const confirmDeleteGroup = (e: React.MouseEvent, group: AppGroup) => {
        e.stopPropagation();
        setGroupToDelete(group);
    };

    const confirmDeleteApp = (app: AppProfile) => {
        setAppToDelete(app);
    };

    // --- API Actions ---

    const handleSaveGroup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingGroup) {
                await appManagerApi.updateGroup({
                    id: editingGroup.id,
                    name: groupForm.name,
                    tags: groupForm.tags
                });
            } else {
                await appManagerApi.createGroup({
                    name: groupForm.name,
                    tags: groupForm.tags
                });
            }
            setIsGroupModalOpen(false);
            loadData();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteGroup = async () => {
        if (!groupToDelete) return;
        setLoading(true);
        try {
            await appManagerApi.deleteGroup(groupToDelete.id);
            setGroupToDelete(null);
            loadData();
        } catch (error: any) {
            alert("Erro ao deletar grupo: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveApp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // 1. Prepare Payload explicitly matching Backend requirements
            const payload = {
                name: appForm.name,
                start_url: appForm.start_url,
                proxy_id: appForm.proxy_id || null,

                // Credentials & Autofill
                login: appForm.login,
                password: appForm.password,
                is_autofill_enabled: Boolean(appForm.is_autofill_enabled),
                sync_credentials: Boolean(appForm.sync_credentials),

                // Advanced Selectors
                login_selector: appForm.login_selector,
                password_selector: appForm.password_selector,

                // Blocks (Sending raw strings as requested)
                ublock_rules: appForm.block_selectors_text,
                url_blocks: appForm.blocked_urls_text
            };

            if (editingApp) {
                await appManagerApi.updateApp({
                    id: editingApp.id,
                    ...payload
                });
            } else {
                if (!selectedGroupId) return;
                await appManagerApi.createApp({
                    group_id: selectedGroupId,
                    ...payload
                });
            }
            setIsAppModalOpen(false);
            loadData();
        } catch (error: any) {
            alert("Erro ao salvar App: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteApp = async () => {
        if (!appToDelete) return;
        setLoading(true);
        try {
            await appManagerApi.deleteApp(appToDelete.id);
            setAppToDelete(null);
            loadData();
        } catch (error: any) {
            alert("Erro ao deletar app: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const executeLaunch = async (appId: string, debug: boolean = false) => {
        setLaunchingId(appId);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { alert("Sessão expirada."); return; }

            // 1. Verificar Role (Admin ou User)
            const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
            const isAdminRole = profile?.role === 'admin';

            // 2. Pedir dados de lançamento ao Backend
            const launchRes = await fetch(`${APP_MANAGER_URL}?target=apps&action=launch&id=${appId}${debug ? '&debug=true' : ''}`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });

            if (!launchRes.ok) throw new Error("Erro ao preparar lançamento via servidor.");
            const launchData = await launchRes.json();

            // 3. Baixar Sessão do Bucket (Se existir URL)
            // O Electron precisa do JSON puro, não da URL
            let sessionJson = null;
            if (launchData.session?.download_url) {
                sessionJson = await downloadSessionJson(launchData.session.download_url);
            }

            // 4. DEFINIR ESTRATÉGIA DE SALVAMENTO
            let strategy = 'never';

            if (isAdminRole) {
                // Admin: Sempre salva ao fechar (mantém cookies frescos)
                strategy = 'always';
            } else if (launchData.credentials.password && Boolean(launchData.credentials.username)) {
                // User com Sync Credentials:
                // Se o servidor mandou a senha, é porque o sync está ativado.
                // Salvamos APENAS se houver um novo login (controlado pelo Electron 'on_login')
                strategy = 'on_login';
            } else {
                // User normal: Apenas consome, nunca sobrescreve
                strategy = 'never';
            }

            console.log(`🚀 Iniciando App. Role: ${isAdminRole ? 'Admin' : 'User'}. Strategy: ${strategy}. Debug: ${debug}`);

            const electronPayload = {
                id: appId,
                name: launchData.app_config.name,
                start_url: launchData.app_config.start_url,

                proxy_data: launchData.network.proxy ? {
                    host: launchData.network.proxy.host,
                    port: launchData.network.proxy.port,
                    protocol: launchData.network.proxy.protocol,
                    username: launchData.network.proxy.auth?.user,
                    password: launchData.network.proxy.auth?.pass,
                    user_agents: { ua_string: launchData.network.user_agent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
                } : null,

                ublock_rules: launchData.app_config.ublock_rules,
                url_blocks: launchData.app_config.url_blocks,

                login: launchData.credentials.username,
                password: launchData.credentials.password,
                is_autofill_enabled: launchData.credentials.is_autofill_enabled,
                login_selector: launchData.credentials.login_selector,
                password_selector: launchData.credentials.password_selector,

                // Enviamos o JSON já baixado
                session_data: sessionJson,

                // Enviamos a estratégia de salvamento
                save_strategy: strategy
            };

            if (window.electronAPI) {
                setRunningApps(prev => [...prev, appId]);

                // Chama Electron e aguarda o fechamento
                const result = await window.electronAPI.launchApp(electronPayload, session.access_token);

                // Lógica de Upload na volta
                if (result.success && result.session_data) {
                    console.log("☁️ Recebido novos dados de sessão do Electron. Enviando para nuvem...");
                    await uploadSessionJson(appId, result.session_data);
                }

                if (!result.success) {
                    console.error("Erro Electron:", result.error);
                    alert("Erro no Electron: " + result.error);
                }

                setRunningApps(prev => prev.filter(id => id !== appId));

            } else {
                alert("Esta função só está disponível na versão Desktop.");
            }

        } catch (error: any) {
            setRunningApps(prev => prev.filter(id => id !== appId));
            console.error(error);
            alert("Erro ao iniciar: " + error.message);
        } finally {
            setLaunchingId(null);
        }
    };

    const handleLaunchApp = (appId: string) => executeLaunch(appId, false);
    const handleLaunchDebug = (appId: string) => executeLaunch(appId, true);

    const handleClearSession = async (appId: string, appName: string) => {
        // Open Confirmation Modal instead of native confirm
        setConfirmModal({
            isOpen: true,
            title: 'Destruir Sessão',
            message: `Tem certeza que deseja destruir a sessão de "${appName}"? Usuários perderão acesso imediato.`,
            onConfirm: async () => {
                setConfirmModal(prev => ({ ...prev, isLoading: true }));
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) return;

                    const res = await fetch(`${APP_MANAGER_URL}?target=apps&action=clear_session&id=${appId}`, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${session.access_token}`
                        }
                    });

                    if (!res.ok) {
                        const err = await res.json();
                        throw new Error(err.error || "Falha ao limpar sessão");
                    }

                    // Success Feedback
                    setFeedbackModal({
                        isOpen: true,
                        title: 'Sucesso',
                        message: 'Sessão limpa com sucesso!',
                        type: 'success'
                    });
                    loadData();
                } catch (error: any) {
                    // Error Feedback
                    setFeedbackModal({
                        isOpen: true,
                        title: 'Erro',
                        message: error.message,
                        type: 'error'
                    });
                } finally {
                    setConfirmModal(prev => ({ ...prev, isOpen: false, isLoading: false }));
                }
            }
        });
    };

    const handleToggleActive = async (appId: string, currentStatus: boolean, appName: string) => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // Envia o novo status invertido
            const newStatus = !currentStatus;

            const res = await fetch(`${APP_MANAGER_URL}?target=apps&action=update_app`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    id: appId,
                    is_active: newStatus
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Falha ao atualizar status do app");
            }

            // Não precisa de feedback visual intrusivo para toggle, apenas reload
            loadData();
        } catch (error: any) {
            setFeedbackModal({
                isOpen: true,
                title: 'Erro',
                message: error.message,
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDuplicateApp = async (appId: string) => {
        setLoading(true);
        try {
            await appManagerApi.duplicateApp(appId);
            setFeedbackModal({
                isOpen: true,
                title: 'Sucesso',
                message: 'Perfil duplicado com sucesso!',
                type: 'success'
            });
            loadData();
        } catch (error: any) {
            setFeedbackModal({
                isOpen: true,
                title: 'Erro',
                message: "Erro ao duplicar perfil: " + error.message,
                type: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const toggleTagSelection = (tagId: string) => {
        setGroupForm(prev => {
            const exists = prev.tags.includes(tagId);
            if (exists) return { ...prev, tags: prev.tags.filter(t => t !== tagId) };
            return { ...prev, tags: [...prev.tags, tagId] };
        });
    };

    // --- Filtering ---

    const filteredApps = apps.filter(app => {
        const matchesGroup = app.group_id === selectedGroupId;
        const matchesSearch = app.name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesGroup && matchesSearch;
    });

    const selectedGroup = groups.find(g => g.id === selectedGroupId);

    return (
        <div className="flex flex-col h-[calc(100vh-6rem)]">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white">Gerenciador de Perfis</h2>
                    <p className="text-zinc-400 text-sm mt-1">Organize seus aplicativos e grupos de navegação</p>
                </div>
                <Button onClick={loadData} variant="secondary" disabled={loading}>
                    <RefreshCcw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Atualizar
                </Button>
            </div>

            <div className="flex flex-1 gap-6 overflow-hidden">

                {/* SIDEBAR: GROUPS */}
                <div className="w-72 flex flex-col gap-4 bg-dark-800 border border-dark-700 rounded-xl overflow-hidden flex-shrink-0">
                    <div className="p-4 border-b border-dark-700 flex items-center justify-between bg-dark-900/30">
                        <h3 className="font-semibold text-white flex items-center gap-2">
                            <Folder className="h-4 w-4 text-zinc-400" />
                            Grupos
                        </h3>
                        {isAdmin && (
                            <button
                                onClick={openCreateGroup}
                                className="p-1 hover:bg-dark-700 rounded text-zinc-400 hover:text-white transition-colors"
                            >
                                <Plus className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {groups.map(group => (
                            <div
                                key={group.id}
                                onClick={() => setSelectedGroupId(group.id)}
                                className={`
                            w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-between group cursor-pointer
                            ${selectedGroupId === group.id
                                        ? 'bg-ninja-600 text-white shadow-lg shadow-ninja-900/20'
                                        : 'text-zinc-400 hover:bg-dark-700 hover:text-white'}
                        `}
                            >
                                <div className="flex items-center gap-2 truncate flex-1">
                                    <Layers className={`h-4 w-4 flex-shrink-0 ${selectedGroupId === group.id ? 'text-white' : 'text-zinc-500'}`} />
                                    <span className="truncate">{group.name}</span>
                                </div>

                                {group.is_default ? (
                                    <ShieldCheck className={`h-3 w-3 flex-shrink-0 ${selectedGroupId === group.id ? 'text-white/80' : 'text-ninja-500'}`} />
                                ) : (
                                    <>
                                        {isAdmin && (
                                            <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${selectedGroupId === group.id ? 'text-white' : 'text-zinc-500'}`}>
                                                <button
                                                    onClick={(e) => openEditGroup(e, group)}
                                                    className="p-1 hover:bg-white/20 rounded"
                                                    title="Editar"
                                                >
                                                    <Edit2 className="h-3 w-3" />
                                                </button>
                                                <button
                                                    onClick={(e) => confirmDeleteGroup(e, group)}
                                                    className="p-1 hover:bg-red-500/50 rounded hover:text-white"
                                                    title="Deletar"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* MAIN: APPS */}
                <div className="flex-1 flex flex-col bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
                    {/* Toolbar */}
                    <div className="p-4 border-b border-dark-700 flex flex-col sm:flex-row gap-4 justify-between bg-dark-900/30">
                        <div className="flex items-center gap-3">
                            <h3 className="text-lg font-bold text-white">
                                {selectedGroup ? selectedGroup.name : 'Selecione um Grupo'}
                            </h3>
                            {selectedGroup?.is_default && <Badge variant="warning">Padrão</Badge>}
                        </div>

                        <div className="flex gap-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                                <input
                                    type="text"
                                    placeholder="Buscar App..."
                                    className="pl-9 pr-4 py-2 bg-dark-900 border border-dark-600 rounded-lg text-sm text-white focus:ring-ninja-500 focus:border-ninja-500"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                            {isAdmin && (
                                <Button onClick={openCreateApp} disabled={!selectedGroupId}>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Novo App
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Grid */}
                    <div className="flex-1 overflow-y-auto p-6 bg-dark-900/50">
                        {filteredApps.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-zinc-500 opacity-60">
                                <Monitor className="h-16 w-16 mb-4 stroke-1" />
                                <p>Nenhum perfil encontrado neste grupo.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {filteredApps.map(app => {
                                    const proxy = proxies.find(p => p.id === app.proxy_id);
                                    const isRunning = runningApps.includes(app.id);
                                    // Default to true if undefined for backward compatibility, or false if strict. 
                                    // User asked: "Se app.is_active === false". So undefined might mean active or we should check explicit false.
                                    // Let's assume undefined = active (legacy apps).
                                    const isActive = app.is_active !== false;

                                    return (
                                        <div key={app.id} className={`relative overflow-hidden bg-dark-800 border border-dark-600 rounded-xl p-4 hover:border-ninja-500/50 transition-all group flex flex-col justify-between min-h-[200px] ${!isActive ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                                            {/* Background Watermark */}
                                            <img
                                                src={`https://www.google.com/s2/favicons?domain=${new URL(app.start_url.startsWith('http') ? app.start_url : `https://${app.start_url}`).hostname}&sz=256`}
                                                alt=""
                                                className="absolute -bottom-10 -right-10 w-48 h-48 opacity-[0.03] grayscale rotate-12 pointer-events-none select-none transition-transform group-hover:scale-110 duration-700"
                                            />

                                            <div className="relative z-10">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className={`p-2.5 rounded-lg transition-colors overflow-hidden flex items-center justify-center ${isRunning ? 'bg-emerald-500/10 text-emerald-500 animate-pulse' : 'bg-dark-700 group-hover:bg-ninja-600/10 group-hover:text-ninja-500'}`}>
                                                        <AppIcon url={app.start_url} isRunning={isRunning} />
                                                    </div>

                                                    {/* Action Buttons: Visible only if Admin */}
                                                    {isAdmin && (
                                                        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                            {/* Toggle Active Button */}
                                                            <button
                                                                onClick={() => handleToggleActive(app.id, isActive, app.name)}
                                                                className={`p-1.5 rounded transition-colors ${isActive ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-zinc-600 hover:bg-zinc-700 hover:text-zinc-400'}`}
                                                                title={isActive ? "Desativar App" : "Ativar App"}
                                                                disabled={isRunning}
                                                            >
                                                                <Power className="h-4 w-4" />
                                                            </button>

                                                            {/* Remote Logout Button */}
                                                            {(app.session_version_hash || app.last_trained_at) && (
                                                                <button
                                                                    onClick={() => handleClearSession(app.id, app.name)}
                                                                    className="p-1.5 text-zinc-500 hover:bg-amber-500/10 hover:text-amber-500 rounded"
                                                                    title="Logout Remoto (Limpar Sessão)"
                                                                    disabled={isRunning}
                                                                >
                                                                    <LogOut className="h-4 w-4" />
                                                                </button>
                                                            )}

                                                            <button
                                                                onClick={() => openEditApp(app)}
                                                                className="p-1.5 text-zinc-500 hover:bg-dark-700 hover:text-white rounded"
                                                                title="Editar"
                                                                disabled={isRunning}
                                                            >
                                                                <Edit2 className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDuplicateApp(app.id)}
                                                                className="p-1.5 text-zinc-500 hover:bg-dark-700 hover:text-white rounded"
                                                                title="Duplicar Configurações"
                                                                disabled={isRunning}
                                                            >
                                                                <Copy className="h-4 w-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => confirmDeleteApp(app)}
                                                                className="p-1.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-500 rounded"
                                                                title="Deletar"
                                                                disabled={isRunning}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                                <h4 className="font-bold text-white mb-1 truncate" title={app.name}>{app.name}</h4>
                                                <p className="text-xs text-zinc-500 mb-4 truncate">{app.start_url}</p>

                                                <div className="space-y-2 mb-4">
                                                    {isAdmin && (
                                                        <>
                                                            <div className="flex items-center gap-2 text-xs text-zinc-400 bg-dark-900/50 p-2 rounded">
                                                                <ShieldCheck className="h-3 w-3 text-emerald-500" />
                                                                <span className="truncate">
                                                                    {proxy ? `${proxy.name} (${proxy.host})` : 'Sem Proxy'}
                                                                </span>
                                                            </div>
                                                            {app.is_autofill_enabled && (
                                                                <div className="flex items-center gap-2 text-xs text-zinc-400 bg-dark-900/50 p-2 rounded">
                                                                    <Zap className="h-3 w-3 text-ninja-500" />
                                                                    <span className="truncate">Autofill Ativo</span>
                                                                </div>
                                                            )}
                                                        </>
                                                    )}
                                                    {!isActive && (
                                                        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20">
                                                            <Ban className="h-3 w-3" />
                                                            <span className="truncate font-medium">Desativado</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex gap-2 mt-auto">
                                                <Button
                                                    onClick={() => handleLaunchApp(app.id)}
                                                    isLoading={launchingId === app.id}
                                                    disabled={isRunning || !isActive}
                                                    className={`flex-1 border transition-colors ${isRunning
                                                        ? 'bg-dark-900/50 border-emerald-500/30 text-emerald-500 cursor-not-allowed hover:bg-dark-900/50'
                                                        : ''
                                                        }`}
                                                    variant={isRunning ? 'secondary' : 'primary'}
                                                >
                                                    {isRunning ? (
                                                        <>
                                                            <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
                                                            Rodando...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Play className="h-4 w-4 mr-2 fill-current" />
                                                            {!isActive ? 'Desativado' : 'Iniciar Perfil'}
                                                        </>
                                                    )}
                                                </Button>

                                                {isAdmin && (
                                                    <Button
                                                        onClick={() => handleLaunchDebug(app.id)}
                                                        isLoading={launchingId === app.id}
                                                        disabled={isRunning || !isActive}
                                                        variant="secondary"
                                                        className="px-3"
                                                        title="Iniciar Modo Teste (Sem Bloqueios)"
                                                    >
                                                        <Bug className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

            </div>

            {/* --- MODAL: CREATE/EDIT GROUP --- */}
            <Modal
                isOpen={isGroupModalOpen}
                onClose={() => setIsGroupModalOpen(false)}
                title={editingGroup ? "Editar Grupo" : "Novo Grupo"}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setIsGroupModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveGroup} isLoading={loading}>
                            {editingGroup ? "Salvar Alterações" : "Criar Grupo"}
                        </Button>
                    </>
                }
            >
                <form className="space-y-4">
                    <Input
                        label="Nome do Grupo"
                        placeholder="Ex: Facebook Ads"
                        value={groupForm.name}
                        onChange={e => setGroupForm({ ...groupForm, name: e.target.value })}
                    />

                    <div>
                        <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Tags</label>
                        <div className="flex flex-wrap gap-2">
                            {tags.map(tag => {
                                const isSelected = groupForm.tags.includes(tag.id);
                                return (
                                    <button
                                        key={tag.id}
                                        type="button"
                                        onClick={() => toggleTagSelection(tag.id)}
                                        className={`
                                    flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                                    ${isSelected
                                                ? 'bg-ninja-600 border-ninja-500 text-white'
                                                : 'bg-dark-900 border-dark-700 text-zinc-400 hover:border-zinc-500'}
                                `}
                                    >
                                        <TagIcon className="h-3 w-3" />
                                        {tag.name}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </form>
            </Modal>

            {/* --- MODAL: CREATE/EDIT APP --- */}
            <Modal
                isOpen={isAppModalOpen}
                onClose={() => setIsAppModalOpen(false)}
                title={editingApp ? "Editar Perfil" : "Novo Perfil (App)"}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setIsAppModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveApp} isLoading={loading}>
                            {editingApp ? "Salvar Alterações" : "Criar Perfil"}
                        </Button>
                    </>
                }
            >
                <form className="space-y-4">
                    <Input
                        label="Nome do Perfil"
                        placeholder="Ex: Conta 01"
                        value={appForm.name}
                        onChange={e => setAppForm({ ...appForm, name: e.target.value })}
                    />

                    <Input
                        label="URL Inicial"
                        placeholder="https://..."
                        value={appForm.start_url}
                        onChange={e => setAppForm({ ...appForm, start_url: e.target.value })}
                    />

                    <div className="space-y-1.5">
                        <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">Proxy (Opcional)</label>
                        <select
                            className="block w-full rounded-lg bg-dark-900 border border-dark-600 text-zinc-100 focus:border-ninja-500 focus:ring-1 focus:ring-ninja-500 py-2.5 px-3 sm:text-sm"
                            value={appForm.proxy_id}
                            onChange={e => setAppForm({ ...appForm, proxy_id: e.target.value })}
                        >
                            <option value="">Sem Proxy (Conexão Direta)</option>
                            {proxies.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name} ({p.host}) - {p.protocol}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Autofill Section */}
                    <div className="pt-4 border-t border-dark-700 mt-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Zap className={`h-4 w-4 ${appForm.is_autofill_enabled ? 'text-ninja-500' : 'text-zinc-500'}`} />
                                <h4 className="text-sm font-medium text-zinc-200">Autofill (Preenchimento Automático)</h4>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={appForm.is_autofill_enabled}
                                    onChange={e => setAppForm({ ...appForm, is_autofill_enabled: e.target.checked })}
                                />
                                <div className="w-11 h-6 bg-dark-900 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-ninja-600"></div>
                            </label>
                        </div>

                        {appForm.is_autofill_enabled && (
                            <div className="space-y-4 animate-fade-in bg-dark-900/30 p-4 rounded-lg border border-dark-700">
                                <Input
                                    label="Login / Usuário"
                                    placeholder="Usuario123"
                                    value={appForm.login}
                                    onChange={e => setAppForm({ ...appForm, login: e.target.value })}
                                />

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">Senha</label>
                                    <div className="relative group">
                                        <input
                                            type={showAutofillPassword ? "text" : "password"}
                                            className="block w-full rounded-lg bg-dark-800 border border-dark-600 text-zinc-100 placeholder-zinc-500 focus:border-ninja-500 focus:ring-1 focus:ring-ninja-500 transition-all sm:text-sm py-2.5 pl-3 pr-10"
                                            placeholder="••••••••"
                                            value={appForm.password}
                                            onChange={e => setAppForm({ ...appForm, password: e.target.value })}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowAutofillPassword(!showAutofillPassword)}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-zinc-500 hover:text-white"
                                            tabIndex={-1}
                                        >
                                            {showAutofillPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Advanced Selectors */}
                                <div className="border border-dark-600 rounded-lg overflow-hidden">
                                    <button
                                        type="button"
                                        className="w-full flex items-center justify-between p-3 bg-dark-800 hover:bg-dark-700 transition-colors text-xs font-medium text-zinc-400"
                                        onClick={() => setShowAdvancedSelectors(!showAdvancedSelectors)}
                                    >
                                        <span>Avançado (Seletores CSS)</span>
                                        {showAdvancedSelectors ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                                    </button>

                                    {showAdvancedSelectors && (
                                        <div className="p-3 bg-dark-900/50 space-y-3">
                                            <p className="text-[10px] text-zinc-500 mb-2">
                                                Use apenas se o site não for detectado automaticamente. Insira o ID ou Classe do input (ex: #email_field).
                                            </p>
                                            <Input
                                                label="Seletor do Login"
                                                placeholder="#username ou .login-input"
                                                className="text-xs font-mono"
                                                value={appForm.login_selector}
                                                onChange={e => setAppForm({ ...appForm, login_selector: e.target.value })}
                                            />
                                            <Input
                                                label="Seletor da Senha"
                                                placeholder="#password ou input[type='password']"
                                                className="text-xs font-mono"
                                                value={appForm.password_selector}
                                                onChange={e => setAppForm({ ...appForm, password_selector: e.target.value })}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Sync Credentials Option (Below Autofill inputs) */}
                                <div className="flex items-center justify-between border-t border-dark-700/50 pt-3 mt-1">
                                    <div className="flex items-center gap-2">
                                        <ArrowRightLeft className="h-4 w-4 text-zinc-400" />
                                        <div>
                                            <span className="block text-sm font-medium text-zinc-300">Sincronizar credenciais com o client</span>
                                            <span className="block text-[10px] text-zinc-500">Se ativado, envia login/senha para o app local.</span>
                                        </div>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={appForm.sync_credentials}
                                            onChange={e => setAppForm({ ...appForm, sync_credentials: e.target.checked })}
                                        />
                                        <div className="w-9 h-5 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Block Selectors Section */}
                    <div className="pt-4 border-t border-dark-700 mt-4">
                        <div className="border border-dark-600 rounded-lg overflow-hidden">
                            <button
                                type="button"
                                className="w-full flex items-center justify-between p-3 bg-dark-800 hover:bg-dark-700 transition-colors text-sm font-medium text-zinc-300"
                                onClick={() => setShowBlockSelectors(!showBlockSelectors)}
                            >
                                <div className="flex items-center gap-2">
                                    <Ban className="h-4 w-4 text-red-400" />
                                    <span>Bloqueio de Elementos (uBlock / CSS)</span>
                                </div>
                                {showBlockSelectors ? <ChevronDown className="h-4 w-4 text-zinc-500" /> : <ChevronRight className="h-4 w-4 text-zinc-500" />}
                            </button>

                            {showBlockSelectors && (
                                <div className="p-4 bg-dark-900/30 space-y-3">
                                    <p className="text-xs text-zinc-500">
                                        Insira os seletores CSS que deseja ocultar nesta página (Opcional).
                                        <br />Um seletor por linha. Exemplo: <code>.ads-banner</code> ou <code>#popup-overlay</code>
                                    </p>

                                    <textarea
                                        className="block w-full rounded-lg bg-dark-800 border border-dark-600 text-zinc-100 placeholder-zinc-500 focus:border-ninja-500 focus:ring-1 focus:ring-ninja-500 transition-all sm:text-sm py-2.5 px-3 font-mono h-32 resize-y"
                                        placeholder={".ads-overlay\n#promo-popup\n.cookie-banner"}
                                        value={appForm.block_selectors_text}
                                        onChange={e => setAppForm({ ...appForm, block_selectors_text: e.target.value })}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Blocked URLs Section */}
                    <div className="pt-4 border-t border-dark-700 mt-4">
                        <div className="border border-dark-600 rounded-lg overflow-hidden">
                            <button
                                type="button"
                                className="w-full flex items-center justify-between p-3 bg-dark-800 hover:bg-dark-700 transition-colors text-sm font-medium text-zinc-300"
                                onClick={() => setShowBlockedUrls(!showBlockedUrls)}
                            >
                                <div className="flex items-center gap-2">
                                    <ShieldAlert className="h-4 w-4 text-amber-500" />
                                    <span>Bloqueio de Navegação (URLs Proibidas)</span>
                                </div>
                                {showBlockedUrls ? <ChevronDown className="h-4 w-4 text-zinc-500" /> : <ChevronRight className="h-4 w-4 text-zinc-500" />}
                            </button>

                            {showBlockedUrls && (
                                <div className="p-4 bg-dark-900/30 space-y-3">
                                    <p className="text-xs text-zinc-500">
                                        URLs que o navegador deve bloquear o carregamento (Opcional).
                                        <br />Uma URL por linha. Exemplo: <code>facebook.com</code> ou <code>*.google-analytics.com</code>
                                    </p>

                                    <textarea
                                        className="block w-full rounded-lg bg-dark-800 border border-dark-600 text-zinc-100 placeholder-zinc-500 focus:border-ninja-500 focus:ring-1 focus:ring-ninja-500 transition-all sm:text-sm py-2.5 px-3 font-mono h-32 resize-y"
                                        placeholder={"ads.google.com\nfacebook.com\n*.tracker.com"}
                                        value={appForm.blocked_urls_text}
                                        onChange={e => setAppForm({ ...appForm, blocked_urls_text: e.target.value })}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </form>
            </Modal>

            {/* --- MODAL: DELETE GROUP CONFIRMATION --- */}
            <Modal
                isOpen={!!groupToDelete}
                onClose={() => setGroupToDelete(null)}
                title="Remover Grupo"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setGroupToDelete(null)}>Cancelar</Button>
                        <Button variant="danger" onClick={handleDeleteGroup} isLoading={loading}>Confirmar Exclusão</Button>
                    </>
                }
            >
                <div className="text-center py-4">
                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-3" />
                    <p className="text-zinc-300">
                        Tem certeza que deseja remover o grupo
                        <strong className="text-white"> {groupToDelete?.name}</strong>?
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">Os Apps dentro dele também serão removidos.</p>
                </div>
            </Modal>

            {/* --- MODAL: DELETE APP CONFIRMATION --- */}
            <Modal
                isOpen={!!appToDelete}
                onClose={() => setAppToDelete(null)}
                title="Remover App"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setAppToDelete(null)}>Cancelar</Button>
                        <Button variant="danger" onClick={handleDeleteApp} isLoading={loading}>Confirmar Exclusão</Button>
                    </>
                }
            >
                <div className="text-center py-4">
                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-3" />
                    <p className="text-zinc-300">
                        Tem certeza que deseja remover o perfil
                        <strong className="text-white"> {appToDelete?.name}</strong>?
                    </p>
                </div>
            </Modal>

            {/* --- MODAL: CONFIRMATION --- */}
            <Modal
                isOpen={confirmModal.isOpen}
                onClose={() => !confirmModal.isLoading && setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                title={confirmModal.title}
                maxWidth="sm"
                footer={
                    <>
                        <Button
                            variant="ghost"
                            onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                            disabled={confirmModal.isLoading}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant="primary"
                            onClick={confirmModal.onConfirm}
                            isLoading={confirmModal.isLoading}
                        >
                            Confirmar
                        </Button>
                    </>
                }
            >
                <div className="flex flex-col items-center text-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                        <AlertTriangle className="h-6 w-6" />
                    </div>
                    <p className="text-zinc-300">{confirmModal.message}</p>
                </div>
            </Modal>

            {/* --- MODAL: FEEDBACK (SUCCESS/ERROR) --- */}
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
                    <div className={`h-12 w-12 rounded-full flex items-center justify-center ${feedbackModal.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                        {feedbackModal.type === 'success' ? <ShieldCheck className="h-6 w-6" /> : <Ban className="h-6 w-6" />}
                    </div>
                    <p className="text-zinc-300">{feedbackModal.message}</p>
                </div>
            </Modal>
        </div >
    );
};