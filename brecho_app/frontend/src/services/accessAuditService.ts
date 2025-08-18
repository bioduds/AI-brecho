import { User } from 'firebase/auth';

export interface AccessLogData {
    firebase_user: {
        uid: string;
        email?: string;
        displayName?: string;
        photoURL?: string;
        providerId?: string;
        emailVerified: boolean;
        metadata?: {
            creationTime?: string;
            lastSignInTime?: string;
        };
    };
    login_method: string;
}

export interface ActivityLogData {
    activity_type: 'page_view' | 'action' | 'api_call';
    activity_name: string;
    activity_data?: Record<string, any>;
    response_status?: number;
    response_time?: number;
}

export interface AccessHistoryItem {
    id: number;
    login_timestamp: string;
    logout_timestamp?: string;
    session_duration?: number;
    ip_address: string;
    browser: string;
    os: string;
    device_type: string;
    country?: string;
    city?: string;
    login_method: string;
    firebase_email: string;
    firebase_display_name?: string;
    pages_visited_count: number;
    actions_performed_count: number;
}

export interface UserActivity {
    id: number;
    activity_type: string;
    activity_name: string;
    page_url: string;
    method: string;
    activity_data?: Record<string, any>;
    response_status?: number;
    response_time?: number;
    timestamp: string;
}

export interface SystemStats {
    total_unique_users: number;
    total_sessions: number;
    active_sessions: number;
    sessions_last_24h: number;
    top_browsers: Array<{ browser: string; count: number }>;
    top_countries: Array<{ country: string; count: number }>;
}

export interface CurrentSession {
    id: number;
    login_timestamp: string;
    current_duration: number;
    ip_address: string;
    browser: string;
    os: string;
    device_type: string;
    country?: string;
    city?: string;
    pages_visited: Array<{
        url: string;
        timestamp: string;
        activity: string;
    }>;
    actions_performed: Array<{
        type: string;
        name: string;
        timestamp: string;
        data?: Record<string, any>;
    }>;
    last_activity?: string;
}

class AccessAuditService {
    private baseUrl: string;
    private currentUser: User | null = null;
    private isEnabled: boolean = false; // Temporariamente desabilitado

    constructor() {
        this.baseUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000';
    }

    setCurrentUser(user: User | null) {
        this.currentUser = user;
    }

    private async apiCall(
        endpoint: string,
        method: 'GET' | 'POST' = 'GET',
        data?: any
    ): Promise<any> {
        // Temporariamente desabilitado para evitar erros
        if (!this.isEnabled) {
            console.log('AccessAuditService: Chamada desabilitada temporariamente', { endpoint, method, data });
            return { status: 'disabled' };
        }

        const startTime = Date.now();

        try {
            const response = await fetch(`${this.baseUrl}/api/auth${endpoint}`, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: data ? JSON.stringify(data) : undefined,
            });

            const responseTime = Date.now() - startTime;
            const result = await response.json();

            // Auto-track API calls se o usuário estiver logado
            if (this.currentUser && !endpoint.includes('/activity')) {
                this.logActivity('api_call', `${method} ${endpoint}`, {
                    endpoint,
                    response_status: response.status,
                    response_time: responseTime
                });
            }

            if (!response.ok) {
                throw new Error(result.detail || 'Erro na API');
            }

            return result;
        } catch (error) {
            console.error('Erro na API:', error);
            throw error;
        }
    }

    async logLogin(user: User, loginMethod: string = 'oauth'): Promise<void> {
        const loginData: AccessLogData = {
            firebase_user: {
                uid: user.uid,
                email: user.email || undefined,
                displayName: user.displayName || undefined,
                photoURL: user.photoURL || undefined,
                providerId: user.providerData[0]?.providerId,
                emailVerified: user.emailVerified,
                metadata: {
                    creationTime: user.metadata.creationTime,
                    lastSignInTime: user.metadata.lastSignInTime,
                },
            },
            login_method: loginMethod,
        };

        await this.apiCall('/login', 'POST', loginData);
        this.setCurrentUser(user);

        // Log page view inicial
        await this.logPageView('login_success');
    }

    async logLogout(): Promise<void> {
        if (!this.currentUser) return;

        await this.apiCall('/logout', 'POST', {
            firebase_uid: this.currentUser.uid
        });

        this.setCurrentUser(null);
    }

    async logActivity(
        activityType: ActivityLogData['activity_type'],
        activityName: string,
        activityData?: Record<string, any>,
        responseStatus?: number,
        responseTime?: number
    ): Promise<void> {
        if (!this.currentUser) return;

        const data: ActivityLogData = {
            activity_type: activityType,
            activity_name: activityName,
            activity_data: activityData,
            response_status: responseStatus,
            response_time: responseTime,
        };

        await this.apiCall(
            `/activity?firebase_uid=${this.currentUser.uid}`,
            'POST',
            data
        );
    }

    async logPageView(pageName: string, additionalData?: Record<string, any>): Promise<void> {
        await this.logActivity('page_view', pageName, {
            url: window.location.href,
            title: document.title,
            timestamp: new Date().toISOString(),
            ...additionalData,
        });
    }

    async logUserAction(actionName: string, actionData?: Record<string, any>): Promise<void> {
        await this.logActivity('action', actionName, actionData);
    }

    async getAccessHistory(limit: number = 50): Promise<AccessHistoryItem[]> {
        if (!this.currentUser) return [];

        const response = await this.apiCall(`/history/${this.currentUser.uid}?limit=${limit}`);
        return response.data;
    }

    async getUserActivities(
        accessLogId?: number,
        limit: number = 100
    ): Promise<UserActivity[]> {
        if (!this.currentUser) return [];

        let endpoint = `/activities/${this.currentUser.uid}?limit=${limit}`;
        if (accessLogId) {
            endpoint += `&access_log_id=${accessLogId}`;
        }

        const response = await this.apiCall(endpoint);
        return response.data;
    }

    async getCurrentSession(): Promise<CurrentSession | null> {
        if (!this.currentUser) return null;

        const response = await this.apiCall(`/current-session/${this.currentUser.uid}`);
        return response.data;
    }

    async getSystemStats(): Promise<SystemStats> {
        const response = await this.apiCall('/stats');
        return response.data;
    }

    // Utilitários para tracking automático
    startPageTracking(): void {
        // Track navigation changes
        const originalPushState = window.history.pushState;
        const originalReplaceState = window.history.replaceState;

        window.history.pushState = function (...args) {
            originalPushState.apply(window.history, args);
            accessAuditService.logPageView(`navigation_${window.location.pathname}`);
        };

        window.history.replaceState = function (...args) {
            originalReplaceState.apply(window.history, args);
            accessAuditService.logPageView(`navigation_${window.location.pathname}`);
        };

        // Track back/forward navigation
        window.addEventListener('popstate', () => {
            accessAuditService.logPageView(`navigation_${window.location.pathname}`);
        });

        // Track page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                accessAuditService.logUserAction('page_hidden');
            } else {
                accessAuditService.logUserAction('page_visible');
            }
        });

        // Track before unload
        window.addEventListener('beforeunload', () => {
            accessAuditService.logUserAction('page_unload');
        });
    }

    // Tracking de cliques automático
    startClickTracking(): void {
        document.addEventListener('click', (event) => {
            const target = event.target as HTMLElement;

            // Track clicks em botões importantes
            if (target.tagName === 'BUTTON' || target.closest('button')) {
                const button = target.closest('button');
                const buttonText = button?.textContent?.trim() || 'Unknown Button';

                this.logUserAction('button_click', {
                    button_text: buttonText,
                    button_id: button?.id,
                    button_class: button?.className,
                    page_url: window.location.href,
                });
            }

            // Track clicks em links
            if (target.tagName === 'A' || target.closest('a')) {
                const link = target.closest('a');

                this.logUserAction('link_click', {
                    link_text: link?.textContent?.trim(),
                    link_href: link?.href,
                    link_target: link?.target,
                    page_url: window.location.href,
                });
            }
        });
    }

    // Método para inicializar tracking completo
    initializeTracking(): void {
        this.startPageTracking();
        this.startClickTracking();
    }
}

// Instância singleton
export const accessAuditService = new AccessAuditService();

// Hook React para usar o serviço
export const useAccessAudit = () => {
    return accessAuditService;
};
