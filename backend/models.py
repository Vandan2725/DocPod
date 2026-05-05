from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class User(Base):
    __tablename__ = "users"
    id            = Column(Integer, primary_key=True, index=True)
    name          = Column(String, nullable=False)
    email         = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    created_at    = Column(DateTime, default=datetime.utcnow)

    documents = relationship("Document", back_populates="user", cascade="all, delete")
    videos    = relationship("Video",    back_populates="user", cascade="all, delete")


class Document(Base):
    __tablename__ = "documents"
    id                = Column(Integer, primary_key=True, index=True)
    user_id           = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename          = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    file_type         = Column(String, nullable=False)
    file_size         = Column(Integer, default=0)
    extracted_text    = Column(Text,    default="")
    status            = Column(String,  default="uploaded")
    uploaded_at       = Column(DateTime, default=datetime.utcnow)

    user  = relationship("User",  back_populates="documents")
    video = relationship("Video", back_populates="document", uselist=False)


class Video(Base):
    __tablename__ = "videos"
    id            = Column(Integer, primary_key=True, index=True)
    user_id       = Column(Integer, ForeignKey("users.id"), nullable=False)
    document_id   = Column(Integer, ForeignKey("documents.id"), nullable=False)
    title         = Column(String, nullable=False)
    voice         = Column(String, default="nova")
    speed         = Column(Float,  default=1.0)
    video_path    = Column(String, default="")
    audio_path    = Column(String, default="")
    duration      = Column(Float,  default=0.0)
    status        = Column(String, default="queued")
    progress      = Column(Integer, default=0)
    error_message = Column(String, default="")
    created_at    = Column(DateTime, default=datetime.utcnow)

    user     = relationship("User",     back_populates="videos")
    document = relationship("Document", back_populates="video")
