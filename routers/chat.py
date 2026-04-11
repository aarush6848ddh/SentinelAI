import os
import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from groq import Groq
from database import get_db
from models.issue import Issue
from models.repository import Repository

router = APIRouter(prefix="/chat", tags=["chat"])
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

class ChatRequest(BaseModel):
    issue_id: int
    message: str
    history: list[dict] = []

class ChatResponse(BaseModel):
    response: str

@router.post("/", response_model=ChatResponse)
def chat(request: ChatRequest, db: Session = Depends(get_db)):
    issue = db.query(Issue).filter(Issue.id == request.issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    
    system_prompt = f"""You are a security and code quality expert helping a developer    
  understand and fix an issue found in their codebase.                                      
                                                                                            
  Issue context:                                                                            
  - Title: {issue.title}
  - Severity: {issue.severity}                                                              
  - Category: {issue.category}
  - File: {issue.file_path}, line {issue.line_number}
  - Description: {issue.description}                                                        
   
  Answer the developer's questions about this issue clearly and concisely. Give actionable  
  fix advice when asked."""
                                                                                            
    messages = [{"role": "system", "content": system_prompt}]
    messages += request.history
    messages.append({"role": "user", "content": request.message})                         
   
    response = client.chat.completions.create(                                            
        model="llama-3.3-70b-versatile",
        messages=messages,
        temperature=0.5,                                                                  
    )
                                                                                        
    return {"response": response.choices[0].message.content}


@router.post("/stream")
def chat_stream(request: ChatRequest, db: Session = Depends(get_db)):
    issue = db.query(Issue).filter(Issue.id == request.issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    system_prompt = f"""You are a security and code quality expert helping a developer understand and fix an issue found in their codebase.

Issue context:
- Title: {issue.title}
- Severity: {issue.severity}
- Category: {issue.category}
- File: {issue.file_path}, line {issue.line_number}
- Description: {issue.description}

Answer the developer's questions about this issue clearly and concisely. Give actionable fix advice when asked."""

    messages = [{"role": "system", "content": system_prompt}]
    messages += request.history
    messages.append({"role": "user", "content": request.message})

    def generate():
        stream = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.5,
            stream=True,
        )
        for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield f"data: {json.dumps({'content': delta})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


class GeneralChatRequest(BaseModel):
    message: str
    history: list[dict] = []


@router.post("/general/stream")
def chat_general_stream(request: GeneralChatRequest, db: Session = Depends(get_db)):
    repos = db.query(Repository).all()

    repo_context = ""
    for repo in repos:
        issues = db.query(Issue).filter(Issue.repository_id == repo.id).all()
        if not issues:
            repo_context += f"\n\n### {repo.full_name}\nNo issues found yet."
            continue
        repo_context += f"\n\n### {repo.full_name}\n"
        for issue in issues:
            repo_context += (
                f"- [{issue.severity.value.upper()}] {issue.title} "
                f"(category: {issue.category.value}, file: {issue.file_path}"
                f"{f', line {issue.line_number}' if issue.line_number else ''}): "
                f"{issue.description}\n"
            )

    system_prompt = f"""You are SentinelAI, a code security assistant. Your job is to translate technical security findings into clear, human-friendly explanations that help a developer understand exactly what is wrong, why it matters, and how to fix it.

You have the full details of all scanned issues below. Always reference the specific issue title, file, and line number. Never use placeholders. Explain things like you're talking to the developer who wrote the code — be direct, practical, and specific.

Tracked repositories and issues:{repo_context if repo_context else " No repositories tracked yet."}

Style rules:
- Explain WHY each issue is a problem in plain English, not just what it is
- Give a specific, concrete fix for THIS codebase, not generic advice
- Prioritize by severity — deal with high/critical first
- Use markdown but keep it scannable, not a wall of text"""

    messages = [{"role": "system", "content": system_prompt}]
    messages += request.history
    messages.append({"role": "user", "content": request.message})

    def generate():
        stream = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=messages,
            temperature=0.5,
            stream=True,
        )
        for chunk in stream:
            delta = chunk.choices[0].delta.content
            if delta:
                yield f"data: {json.dumps({'content': delta})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")