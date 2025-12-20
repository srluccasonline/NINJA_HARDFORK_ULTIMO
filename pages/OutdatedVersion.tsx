import React from 'react';
import { Download, AlertTriangle, ShieldAlert } from 'lucide-react';

export const OutdatedVersion: React.FC = () => {
    return (
        <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-4 font-sans overflow-hidden relative">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-900/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-orange-900/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-md w-full relative z-10">
                <div className="bg-[#141417]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl overflow-hidden group">
                    {/* Animated Gradient Border Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-transparent to-orange-500/10 opacity-50 group-hover:opacity-100 transition-opacity duration-700" />

                    <div className="relative z-20 flex flex-col items-center text-center">
                        {/* Icon Container */}
                        <div className="mb-6 relative">
                            <div className="p-5 bg-red-500/10 rounded-2xl relative animate-pulse">
                                <ShieldAlert className="w-12 h-12 text-red-500" />
                            </div>
                            <div className="absolute -top-1 -right-1">
                                <div className="bg-orange-500 rounded-full p-1.5 border-4 border-[#141417]">
                                    <AlertTriangle className="w-3 h-3 text-white" />
                                </div>
                            </div>
                        </div>

                        <h1 className="text-3xl font-extrabold text-white mb-3 tracking-tight">
                            Acesso Bloqueado
                        </h1>

                        <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                            Sua versão do <span className="text-red-400 font-semibold italic">NINJABR</span> está desatualizada. Para garantir sua segurança e estabilidade, você precisa utilizar a versão mais recente.
                        </p>

                        <div className="w-full space-y-4">
                            <a
                                href="https://multiloginninjabr.lovable.app/"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-3 w-full py-4 px-6 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white font-bold rounded-2xl transition-all duration-300 shadow-lg shadow-red-950/20 transform hover:-translate-y-1 active:scale-95 group/btn"
                            >
                                <Download className="w-5 h-5 group-hover/btn:animate-bounce" />
                                BAIXAR NOVA VERSÃO
                            </a>

                            <div className="pt-2">
                                <p className="text-xs text-gray-500 font-medium tracking-widest uppercase">
                                    Código de Erro: VERSAO_DESATUALIZADA
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Simple Footer Decorative Text */}
                <p className="mt-8 text-center text-gray-600 text-sm font-medium tracking-wide">
                    &copy; 2025 NINJABR. Todos os direitos reservados.
                </p>
            </div>

            <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .max-w-md {
          animation: fadeIn 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>
        </div>
    );
};
