from fastapi import FastAPI
from database import engine, Base
import models
from routers import pull_requests, repositories, crawl_jobs, issues

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SentinelAI", version="1.0")

app.include_router(repositories.router)
app.include_router(crawl_jobs.router)
app.include_router(pull_requests.router)
app.include_router(issues.router)

@app.get("/health")
def health_check():
    return {"status": "ok"}
