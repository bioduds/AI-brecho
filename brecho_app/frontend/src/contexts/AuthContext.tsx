import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../config/firebase';
import { accessAuditService } from '../services/accessAuditService';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    error: Error | undefined;
    isAuthenticated: boolean;
    loginWithAudit: (user: User, method?: string) => Promise<void>;
    logoutWithAudit: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    error: undefined,
    isAuthenticated: false,
    loginWithAudit: async () => { },
    logoutWithAudit: async () => { },
});

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, loading, error] = useAuthState(auth);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [auditInitialized, setAuditInitialized] = useState(false);

    // Função para login com auditoria completa
    const loginWithAudit = async (firebaseUser: User, method: string = 'oauth') => {
        try {
            // Registrar login na auditoria
            await accessAuditService.logLogin(firebaseUser, method);

            // Inicializar tracking se ainda não foi feito
            if (!auditInitialized) {
                accessAuditService.initializeTracking();
                setAuditInitialized(true);
            }

            console.log('✅ Login e auditoria registrados com sucesso');
        } catch (error) {
            console.error('❌ Erro ao registrar login na auditoria:', error);
            // Não bloquear o login mesmo se a auditoria falhar
        }
    };

    // Função para logout com auditoria
    const logoutWithAudit = async () => {
        try {
            // Registrar logout na auditoria
            await accessAuditService.logLogout();

            // Fazer logout no Firebase
            await auth.signOut();

            console.log('✅ Logout e auditoria registrados com sucesso');
        } catch (error) {
            console.error('❌ Erro ao registrar logout na auditoria:', error);
            // Fazer logout mesmo se a auditoria falhar
            await auth.signOut();
        }
    };

    // Effect para detectar mudanças de autenticação
    useEffect(() => {
        setIsAuthenticated(!!user);

        if (user) {
            // Configurar usuário atual no serviço de auditoria
            accessAuditService.setCurrentUser(user);

            // Se o usuário já estava logado (refresh da página), registrar como page_view
            if (!auditInitialized) {
                accessAuditService.logPageView('page_refresh', {
                    user_already_authenticated: true,
                    page_url: window.location.href
                });

                accessAuditService.initializeTracking();
                setAuditInitialized(true);
            }
        } else {
            // Limpar usuário do serviço de auditoria
            accessAuditService.setCurrentUser(null);
            setAuditInitialized(false);
        }
    }, [user, auditInitialized]);

    // Effect para detectar saída da página (importante para auditoria)
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (user) {
                // Usar navigator.sendBeacon para garantir que o logout seja registrado
                // mesmo quando o usuário fecha a aba
                const logoutData = JSON.stringify({
                    firebase_uid: user.uid
                });

                navigator.sendBeacon(
                    `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/auth/logout`,
                    logoutData
                );
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [user]);

    const value: AuthContextType = {
        user: user || null,
        loading,
        error,
        isAuthenticated,
        loginWithAudit,
        logoutWithAudit,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// Hook customizado para auditoria de páginas
export const usePageAudit = (pageName: string) => {
    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            accessAuditService.logPageView(pageName, {
                timestamp: new Date().toISOString(),
                user_id: user.uid,
                page_title: document.title
            });
        }
    }, [user, pageName]);
};

// Hook para auditoria de ações
export const useActionAudit = () => {
    const { user } = useAuth();

    const logAction = async (actionName: string, actionData?: Record<string, any>) => {
        if (user) {
            await accessAuditService.logUserAction(actionName, {
                ...actionData,
                timestamp: new Date().toISOString(),
                user_id: user.uid
            });
        }
    };

    return { logAction };
};
