import json
import re
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from fastapi import Request
import geoip2.database
import geoip2.errors
from user_agents import parse

from models import UserAccessLog, UserActivity
from database import get_db


class AccessAuditService:
    """Serviço completo de auditoria de acessos de usuários"""

    def __init__(self, db: Session):
        self.db = db

    async def log_user_login(
        self,
        firebase_user_data: Dict[str, Any],
        request: Request,
        login_method: str = "oauth",
    ) -> UserAccessLog:
        """
        Registra um login completo do usuário com todos os dados possíveis
        """

        # Extrair dados técnicos do request
        technical_data = self._extract_technical_data(request)

        # Extrair dados de localização
        location_data = self._extract_location_data(request)

        # Criar o log de acesso
        access_log = UserAccessLog(
            # Dados do Firebase
            firebase_uid=firebase_user_data.get("uid"),
            firebase_email=firebase_user_data.get("email"),
            firebase_display_name=firebase_user_data.get("displayName"),
            firebase_photo_url=firebase_user_data.get("photoURL"),
            firebase_provider_id=firebase_user_data.get("providerId"),
            firebase_email_verified=firebase_user_data.get("emailVerified", False),
            firebase_creation_time=self._parse_firebase_timestamp(
                firebase_user_data.get("metadata", {}).get("creationTime")
            ),
            firebase_last_sign_in_time=self._parse_firebase_timestamp(
                firebase_user_data.get("metadata", {}).get("lastSignInTime")
            ),
            # Dados técnicos
            ip_address=technical_data["ip_address"],
            user_agent=technical_data["user_agent"],
            browser=technical_data["browser"],
            os=technical_data["os"],
            device_type=technical_data["device_type"],
            # Dados de localização
            country=location_data.get("country"),
            city=location_data.get("city"),
            timezone=location_data.get("timezone"),
            # Status do login
            login_successful=True,
            login_method=login_method,
            # Atividade inicial
            pages_visited=json.dumps([]),
            actions_performed=json.dumps([]),
            last_activity=datetime.now(timezone.utc),
        )

        self.db.add(access_log)
        self.db.commit()
        self.db.refresh(access_log)

        return access_log

    async def log_user_logout(self, firebase_uid: str) -> None:
        """Registra o logout do usuário e calcula duração da sessão"""

        # Buscar o último login ativo
        access_log = (
            self.db.query(UserAccessLog)
            .filter(
                UserAccessLog.firebase_uid == firebase_uid,
                UserAccessLog.logout_timestamp.is_(None),
            )
            .order_by(UserAccessLog.login_timestamp.desc())
            .first()
        )

        if access_log:
            logout_time = datetime.now(timezone.utc)
            session_duration = int(
                (logout_time - access_log.login_timestamp).total_seconds()
            )

            access_log.logout_timestamp = logout_time
            access_log.session_duration = session_duration

            self.db.commit()

    async def log_user_activity(
        self,
        firebase_uid: str,
        activity_type: str,
        activity_name: str,
        request: Request,
        activity_data: Optional[Dict[str, Any]] = None,
        response_status: Optional[int] = None,
        response_time: Optional[float] = None,
    ) -> None:
        """Registra uma atividade específica do usuário"""

        # Buscar o log de acesso ativo
        access_log = (
            self.db.query(UserAccessLog)
            .filter(
                UserAccessLog.firebase_uid == firebase_uid,
                UserAccessLog.logout_timestamp.is_(None),
            )
            .order_by(UserAccessLog.login_timestamp.desc())
            .first()
        )

        if access_log:
            # Criar registro de atividade
            activity = UserActivity(
                access_log_id=access_log.id,
                firebase_uid=firebase_uid,
                activity_type=activity_type,
                activity_name=activity_name,
                page_url=str(request.url),
                method=request.method,
                activity_data=json.dumps(activity_data) if activity_data else None,
                response_status=response_status,
                response_time=response_time,
            )

            self.db.add(activity)

            # Atualizar atividade no log principal
            access_log.last_activity = datetime.now(timezone.utc)

            # Atualizar páginas visitadas
            pages_visited = json.loads(access_log.pages_visited or "[]")
            page_info = {
                "url": str(request.url),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "activity": activity_name,
            }
            pages_visited.append(page_info)
            access_log.pages_visited = json.dumps(
                pages_visited[-50:]
            )  # Manter últimas 50

            # Atualizar ações realizadas
            actions_performed = json.loads(access_log.actions_performed or "[]")
            action_info = {
                "type": activity_type,
                "name": activity_name,
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "data": activity_data,
            }
            actions_performed.append(action_info)
            access_log.actions_performed = json.dumps(
                actions_performed[-100:]
            )  # Manter últimas 100

            self.db.commit()

    def _extract_technical_data(self, request: Request) -> Dict[str, str]:
        """Extrai dados técnicos do request"""

        # IP Address
        ip_address = self._get_client_ip(request)

        # User Agent
        user_agent_string = request.headers.get("user-agent", "")
        user_agent = parse(user_agent_string)

        return {
            "ip_address": ip_address,
            "user_agent": user_agent_string,
            "browser": f"{user_agent.browser.family} {user_agent.browser.version_string}",
            "os": f"{user_agent.os.family} {user_agent.os.version_string}",
            "device_type": self._get_device_type(user_agent),
        }

    def _extract_location_data(self, request: Request) -> Dict[str, Optional[str]]:
        """Extrai dados de localização baseado no IP"""

        ip_address = self._get_client_ip(request)

        try:
            # Tentar usar GeoIP2 (seria necessário instalar a biblioteca e baixar o database)
            # with geoip2.database.Reader('/path/to/GeoLite2-City.mmdb') as reader:
            #     response = reader.city(ip_address)
            #     return {
            #         "country": response.country.name,
            #         "city": response.city.name,
            #         "timezone": str(response.location.time_zone)
            #     }
            pass
        except:
            pass

        # Fallback - usar headers se disponível
        return {
            "country": request.headers.get("cf-ipcountry"),  # Cloudflare
            "city": None,
            "timezone": request.headers.get("cf-timezone"),  # Cloudflare
        }

    def _get_client_ip(self, request: Request) -> str:
        """Obtém o IP real do cliente considerando proxies/load balancers"""

        # Verificar headers de proxy
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()

        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip

        # Cloudflare
        cf_connecting_ip = request.headers.get("cf-connecting-ip")
        if cf_connecting_ip:
            return cf_connecting_ip

        return request.client.host if request.client else "unknown"

    def _get_device_type(self, user_agent) -> str:
        """Determina o tipo de dispositivo"""

        if user_agent.is_mobile:
            return "mobile"
        elif user_agent.is_tablet:
            return "tablet"
        elif user_agent.is_pc:
            return "desktop"
        else:
            return "unknown"

    def _parse_firebase_timestamp(
        self, timestamp_str: Optional[str]
    ) -> Optional[datetime]:
        """Converte timestamp do Firebase para datetime"""

        if not timestamp_str:
            return None

        try:
            # Firebase retorna em formato ISO
            return datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
        except:
            return None

    async def get_user_access_history(
        self, firebase_uid: str, limit: int = 50
    ) -> List[UserAccessLog]:
        """Obtém o histórico de acessos de um usuário"""

        return (
            self.db.query(UserAccessLog)
            .filter(UserAccessLog.firebase_uid == firebase_uid)
            .order_by(UserAccessLog.login_timestamp.desc())
            .limit(limit)
            .all()
        )

    async def get_user_activities(
        self, firebase_uid: str, access_log_id: Optional[int] = None, limit: int = 100
    ) -> List[UserActivity]:
        """Obtém as atividades de um usuário"""

        query = self.db.query(UserActivity).filter(
            UserActivity.firebase_uid == firebase_uid
        )

        if access_log_id:
            query = query.filter(UserActivity.access_log_id == access_log_id)

        return query.order_by(UserActivity.timestamp.desc()).limit(limit).all()

    async def get_system_access_stats(self) -> Dict[str, Any]:
        """Obtém estatísticas gerais de acesso ao sistema"""

        total_users = self.db.query(UserAccessLog.firebase_uid).distinct().count()
        total_sessions = self.db.query(UserAccessLog).count()
        active_sessions = (
            self.db.query(UserAccessLog)
            .filter(UserAccessLog.logout_timestamp.is_(None))
            .count()
        )

        # Estatísticas por período
        from sqlalchemy import func, desc
        from datetime import datetime, timedelta

        last_24h = datetime.now(timezone.utc) - timedelta(hours=24)
        sessions_24h = (
            self.db.query(UserAccessLog)
            .filter(UserAccessLog.login_timestamp >= last_24h)
            .count()
        )

        # Top browsers
        top_browsers = (
            self.db.query(
                UserAccessLog.browser, func.count(UserAccessLog.browser).label("count")
            )
            .group_by(UserAccessLog.browser)
            .order_by(desc("count"))
            .limit(5)
            .all()
        )

        # Top countries
        top_countries = (
            self.db.query(
                UserAccessLog.country, func.count(UserAccessLog.country).label("count")
            )
            .filter(UserAccessLog.country.isnot(None))
            .group_by(UserAccessLog.country)
            .order_by(desc("count"))
            .limit(5)
            .all()
        )

        return {
            "total_unique_users": total_users,
            "total_sessions": total_sessions,
            "active_sessions": active_sessions,
            "sessions_last_24h": sessions_24h,
            "top_browsers": [{"browser": b[0], "count": b[1]} for b in top_browsers],
            "top_countries": [{"country": c[0], "count": c[1]} for c in top_countries],
        }


# Função helper para obter o serviço
def get_access_audit_service(db: Session = None) -> AccessAuditService:
    if db is None:
        db = next(get_db())
    return AccessAuditService(db)
