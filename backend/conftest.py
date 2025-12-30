"""
Configuração compartilhada para testes pytest
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import NullPool
import os
import sys
import tempfile

# Adicionar o diretório raiz ao path para imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Configurar variável de ambiente para testes ANTES de importar qualquer módulo
# Usar arquivo temporário ao invés de :memory: para evitar problemas de thread safety
test_db_file = tempfile.NamedTemporaryFile(delete=False, suffix='.db')
test_db_path = test_db_file.name
test_db_file.close()

# Configurar DATABASE_URL para testes
os.environ["DATABASE_URL"] = f"sqlite:///{test_db_path}"
os.environ["TESTING"] = "1"

from database import Base
import models

# Importar main DEPOIS de configurar DATABASE_URL
from main import app, get_db

# Criar engine de teste
SQLALCHEMY_DATABASE_URL = f"sqlite:///{test_db_path}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=NullPool,  # NullPool evita problemas de thread safety
    echo=False
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Criar tabelas uma vez antes de todos os testes
@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Cria as tabelas antes de executar os testes"""
    Base.metadata.create_all(bind=engine)
    yield
    # Limpar após todos os testes
    Base.metadata.drop_all(bind=engine)
    try:
        if os.path.exists(test_db_path):
            os.unlink(test_db_path)
    except:
        pass


@pytest.fixture(scope="function")
def db_session():
    """Cria uma sessão de banco de dados para cada teste"""
    db = TestingSessionLocal()
    
    # Limpar dados antes de cada teste
    try:
        for table in reversed(Base.metadata.sorted_tables):
            db.execute(table.delete())
        db.commit()
    except:
        db.rollback()
    
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="function")
def client(db_session, monkeypatch):
    """Cria um cliente de teste do FastAPI"""
    def override_get_db():
        # Criar uma nova sessão para cada requisição
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()
    
    app.dependency_overrides[get_db] = override_get_db
    
    # Mockar API_KEY no módulo main para testes
    test_api_key = "test-api-key-123"
    import main
    monkeypatch.setattr(main, "API_KEY", test_api_key)
    
    with TestClient(app) as test_client:
        yield test_client
    
    # Limpar dependency_overrides
    app.dependency_overrides.clear()


@pytest.fixture
def api_key():
    """Retorna a API key para uso nos testes"""
    return "test-api-key-123"
