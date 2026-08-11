from sqlalchemy import Column, Integer, String, Text, DateTime, Enum as SQLEnum
from sqlalchemy.sql import func
from datetime import datetime
import enum

from app.database import Base


class ClusterStatus(str, enum.Enum):
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    ERROR = "error"
    UNKNOWN = "unknown"


class Cluster(Base):
    __tablename__ = "clusters"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(255), nullable=False, unique=True)
    description = Column(Text, nullable=True)
    api_server_url = Column(String(512), nullable=False)
    kubeconfig = Column(Text, nullable=False)  # Encrypted kubeconfig content
    status = Column(SQLEnum(ClusterStatus), default=ClusterStatus.UNKNOWN)
    version = Column(String(50), nullable=True)
    nodes_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    last_health_check = Column(DateTime, nullable=True)

    def __repr__(self):
        return f"<Cluster(id={self.id}, name={self.name}, status={self.status})>"
