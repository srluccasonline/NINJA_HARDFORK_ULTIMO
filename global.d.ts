export { };

declare global {
    interface Window {
        electronAPI?: {
            launchApp: (profile: any, token: string) => Promise<{ success: boolean; error?: string; session_data?: any }>;
            killAllApps: () => Promise<void>;
            onAppClosed: (callback: (event: any, id: string) => void) => void;
        };
    }
}