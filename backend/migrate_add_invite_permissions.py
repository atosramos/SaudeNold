"""
Migration: Adicionar campo permissions à tabela family_invites
"""
import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Adicionar o diretório backend ao path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Configuração do banco de dados
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/saude")

def migrate():
    engine = create_engine(DATABASE_URL)
    Session = sessionmaker(bind=engine)
    
    with Session() as session:
        try:
            # Verificar se a coluna já existe
            check_query = text("""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='family_invites' AND column_name='permissions'
            """)
            result = session.execute(check_query).fetchone()
            
            if result:
                print("✓ Coluna 'permissions' já existe na tabela 'family_invites'")
                return
            
            # Adicionar coluna permissions
            alter_query = text("""
                ALTER TABLE family_invites 
                ADD COLUMN permissions JSON
            """)
            session.execute(alter_query)
            session.commit()
            print("✓ Coluna 'permissions' adicionada à tabela 'family_invites'")
            
        except Exception as e:
            session.rollback()
            print(f"✗ Erro na migration: {str(e)}")
            raise

if __name__ == "__main__":
    migrate()
