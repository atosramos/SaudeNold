"""
Configuração compartilhada para testes pytest
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import os
import sys

# Adicionar o diretório raiz ao path para imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import Base
from main import app, get_db
import models

# Database de teste em memória (SQLite)
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    """Cria uma sessão de banco de dados para cada teste"""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session, monkeypatch):
    """Cria um cliente de teste do FastAPI"""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass
    
    app.dependency_overrides[get_db] = override_get_db
    
    # Mockar API_KEY no módulo main para testes
    # monkeypatch.setattr funciona mesmo após a importação do módulo
    test_api_key = "test-api-key-123"
    import main
    monkeypatch.setattr(main, "API_KEY", test_api_key)
    
    with TestClient(app) as test_client:
        yield test_client
    
    # monkeypatch restaura automaticamente, mas limpamos dependency_overrides manualmente
    app.dependency_overrides.clear()


@pytest.fixture
def api_key():
    """Retorna a API key para uso nos testes"""
    return "test-api-key-123"

