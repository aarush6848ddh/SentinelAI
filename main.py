from fastapi import FastAPI
from sqlalchemy import text
from database import engine, Base
import models
from routers import pull_requests, repositories, crawl_jobs, issues, chat, github
from fastapi.middleware.cors import CORSMiddleware

# enable pgvector extension once at startup, before tables are created
with engine.connect() as conn:
    conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    conn.commit()

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SentinelAI", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(repositories.router)
app.include_router(crawl_jobs.router)
app.include_router(pull_requests.router)
app.include_router(issues.router)
app.include_router(chat.router)
app.include_router(github.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}
