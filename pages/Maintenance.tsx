import React from 'react';
import { Clock, AlertCircle, Hammer } from 'lucide-react';

export const Maintenance: React.FC = () => {
    return (
        <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-4 font-sans overflow-hidden relative">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none" />

            <div className="max-w-md w-full relative z-10">
                <div className="bg-[#141417]/80 backdrop-blur-xl border border-white/5 rounded-3xl p-8 shadow-2xl overflow-hidden group">
                    {/* Animated Gradient Border Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-purple-500/10 opacity-50 group-hover:opacity-100 transition-opacity duration-700" />

                    <div className="relative z-20 flex flex-col items-center text-center">
                        {/* Icon Container */}
                        <div className="mb-6 relative">
                            <div className="p-5 bg-blue-500/10 rounded-2xl relative animate-pulse">
                                <Hammer className="w-12 h-12 text-blue-500" />
                            </div>
                            <div className="absolute -top-1 -right-1">
                                <div className="bg-purple-500 rounded-full p-1.5 border-4 border-[#141417]">
                                    <Clock className="w-3 h-3 text-white" />
                                </div>
                            </div>
                        </div>

                        <h1 className="text-3xl font-extrabold text-white mb-3 tracking-tight">
                            Manutenção em Andamento
                        </h1>

                        <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                            Estamos em manutenção, voltaremos amanha entre as <span className="text-blue-400 font-semibold">9h-10h</span>.
                        </p>

                        <div className="w-full space-y-4">
                            <div className="flex items-center justify-center gap-2 text-gray-500 text-sm py-4 border-t border-white/5">
                                <AlertCircle className="w-4 h-4" />
                                <span>Agradecemos a sua paciência.</span>
                            </div>

                            <div className="pt-2">
                                <p className="text-xs text-gray-500 font-medium tracking-widest uppercase">
                                    STATUS: OFFLINE
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Simple Footer Decorative Text */}
                <p className="mt-8 text-center text-gray-600 text-sm font-medium tracking-wide">
                    &copy; 2026 NINJA PRO. Todos os direitos reservados.
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
