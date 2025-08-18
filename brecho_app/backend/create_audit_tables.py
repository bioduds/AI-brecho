#!/usr/bin/env python3
"""
Script para criar as tabelas de auditoria de acessos no banco de dados
"""

import sys
import os

# Adicionar o diretório do backend ao path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import create_engine
from models import Base, UserAccessLog, UserActivity
from database import engine
from config import settings


def create_audit_tables():
    """Cria as tabelas de auditoria no banco de dados"""

    print("🔧 Criando tabelas de auditoria...")

    try:
        # Criar todas as tabelas
        Base.metadata.create_all(bind=engine)

        print("✅ Tabelas de auditoria criadas com sucesso!")
        print(f"📊 Banco de dados: {settings.DATABASE_URL}")
        print("\n📋 Tabelas criadas:")
        print("  - user_access_logs: Logs completos de acesso")
        print("  - user_activities: Atividades detalhadas dos usuários")

        # Verificar se as tabelas foram criadas
        from sqlalchemy import inspect

        inspector = inspect(engine)
        tables = inspector.get_table_names()

        audit_tables = ["user_access_logs", "user_activities"]
        for table in audit_tables:
            if table in tables:
                print(f"  ✅ {table}")

                # Mostrar colunas da tabela
                columns = inspector.get_columns(table)
                print(
                    f"     Colunas ({len(columns)}): {', '.join([col['name'] for col in columns[:10]])}..."
                )
            else:
                print(f"  ❌ {table} - ERRO!")

        print("\n🎯 Sistema de auditoria pronto para uso!")
        print("\n📊 Funcionalidades disponíveis:")
        print("  - Tracking completo de logins/logouts")
        print("  - Dados técnicos (IP, browser, OS, device)")
        print("  - Localização geográfica")
        print("  - Histórico de páginas visitadas")
        print("  - Log de ações realizadas")
        print("  - Duração de sessões")
        print("  - Estatísticas do sistema")

    except Exception as e:
        print(f"❌ Erro ao criar tabelas: {str(e)}")
        return False

    return True


def verify_audit_system():
    """Verifica se o sistema de auditoria está funcionando"""

    print("\n🔍 Verificando sistema de auditoria...")

    try:
        from sqlalchemy.orm import sessionmaker

        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()

        # Testar queries básicas
        total_logs = db.query(UserAccessLog).count()
        total_activities = db.query(UserActivity).count()

        print(f"📊 Logs de acesso: {total_logs}")
        print(f"📊 Atividades registradas: {total_activities}")

        db.close()

        print("✅ Sistema de auditoria verificado com sucesso!")

    except Exception as e:
        print(f"❌ Erro na verificação: {str(e)}")
        return False

    return True


if __name__ == "__main__":
    print("🚀 Inicializando Sistema de Auditoria de Acessos")
    print("=" * 50)

    success = create_audit_tables()

    if success:
        verify_audit_system()

        print("\n" + "=" * 50)
        print("🎉 Sistema de Auditoria inicializado com sucesso!")
        print("\n💡 Próximos passos:")
        print("  1. Reiniciar o servidor backend")
        print("  2. Fazer login no frontend")
        print("  3. Verificar logs de auditoria")
        print("\n🔗 Endpoints disponíveis:")
        print("  - POST /api/auth/login - Registrar login")
        print("  - POST /api/auth/logout - Registrar logout")
        print("  - POST /api/auth/activity - Registrar atividade")
        print("  - GET /api/auth/history/{uid} - Histórico de acessos")
        print("  - GET /api/auth/stats - Estatísticas do sistema")
    else:
        print("\n💥 Falha na inicialização do sistema de auditoria!")
        sys.exit(1)
