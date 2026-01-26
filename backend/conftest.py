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
# Configurar LICENSE_SECRET_KEY para testes (chave de teste)
os.environ["LICENSE_SECRET_KEY"] = "test-secret-key-for-license-generation-12345678901234567890"

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


@pytest.fixture
def csrf_token():
    """Obtém um token CSRF para uso nos testes"""
    from services.csrf_service import generate_and_store_csrf_token
    # Gerar token CSRF diretamente (sem precisar de autenticação)
    # Em testes, podemos mockar ou gerar diretamente
    token = generate_and_store_csrf_token()
    if not token:
        # Fallback: gerar token manualmente para testes
        import secrets
        token = secrets.token_urlsafe(32)
        from services.csrf_service import store_csrf_token
        store_csrf_token(token)
    return token


@pytest.fixture
def test_user(db_session):
    """Cria um usuário de teste e retorna"""
    from auth import hash_password
    from models import User
    
    user = User(
        email="test@example.com",
        password_hash=hash_password("Test1234!"),
        is_active=True,
        email_verified=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def jwt_token(test_user):
    """Cria um token JWT para o usuário de teste"""
    from auth import create_access_token
    
    return create_access_token({
        "sub": str(test_user.id),
        "email": test_user.email
    })


@pytest.fixture
def test_profile(db_session, test_user):
    """Cria um perfil de teste e retorna"""
    from models import Family, FamilyProfile
    
    # Criar família para o usuário
    family = Family(
        name="Test Family",
        admin_user_id=test_user.id
    )
    db_session.add(family)
    db_session.commit()
    db_session.refresh(family)
    
    # Associar usuário à família
    test_user.family_id = family.id
    db_session.commit()
    
    # Criar perfil
    profile = FamilyProfile(
        family_id=family.id,
        name="Test Profile",
        account_type="adult_member"
    )
    db_session.add(profile)
    db_session.commit()
    db_session.refresh(profile)
    
    return profile
