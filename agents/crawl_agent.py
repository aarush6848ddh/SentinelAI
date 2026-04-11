import os 
import json
from groq import Groq
from database import SessionLocal
from models.crawl_job import CrawlStatus
from models.repository import Repository
from tools.github_tool import GitHubTool
from tools.db_tool import DBTool

client = Groq(api_key=os.getenv("GROQ_API_KEY"))

def run_crawl(crawl_job_id: int, repository_id: int):
    db = SessionLocal()
    db_tool = DBTool(db)

    try:
        db_tool.update_crawl_job(crawl_job_id, CrawlStatus.running)

        repo = db.query(Repository).filter(Repository.id == repository_id).first()
        github_tool = GitHubTool(token=os.getenv("GITHUB_TOKEN"), repo=repo.full_name)

        file_paths = github_tool.get_file_tree()
        all_issues = []

        for path in file_paths:
            try:
                content = github_tool.get_file_content(path)
            except Exception:
                continue
            
            issues = analyze_file(path, content)
            all_issues.extend(issues)

        db_tool.clear_issues(repository_id)
        if all_issues:
            db_tool.save_issues_bulk(repository_id, all_issues)
        
        db_tool.update_crawl_job(crawl_job_id, CrawlStatus.completed)

    except Exception as e:
        db_tool.update_crawl_job(crawl_job_id, CrawlStatus.failed, error_message=str(e))
    finally:
        db.close()


def map_category(raw: str) -> str:                                                                       
      security_keywords = ("injection", "xss", "secret", "auth", "crypto", "insecure", "exposure",         
  "overflow", "traversal", "ssrf", "csrf")                                                                 
      bug_keywords = ("null", "dereference", "logic", "error", "exception", "race", "memory", "leak")
      if any(k in raw.lower() for k in security_keywords):                                                 
          return "security"                                                                                
      if any(k in raw.lower() for k in bug_keywords):                                                      
          return "bug"                                                                                     
      return "quality"


def analyze_file(path: str, content: str) -> list[dict]:
      prompt = f"""You are a security and code quality reviewer. Analyze the following file for security
  vulnerabilities and bugs.

  File: {path}

  {content[:6000]}

  Return a JSON array of issues found. Each issue must have these fields:
  - title: short description (string)
  - description: detailed explanation of the issue and recommendations on how to fix it (string)
  - severity: one of "critical", "high", "medium", "low" (string)
  - category: e.g. "sql-injection", "xss", "hardcoded-secret", "null-dereference", "logic-error", etc.
  (string)
  - file_path: the file path provided above (string)
  - line_number: approximate line number of the issue, or null if unknown (integer or null)

  Return only the JSON array, no explanation. If no issues are found, return an empty array [].
  """

      response = client.chat.completions.create(
          model="llama-3.3-70b-versatile",
          messages=[{"role": "user", "content": prompt}],
          temperature=0.2,
      )

      raw = response.choices[0].message.content.strip()

      try:                                                                                                     
        issues = json.loads(raw)                                                                             
        if isinstance(issues, list):                                                                         
            for issue in issues:                                                                             
                issue["category"] = map_category(issue.get("category", ""))
            return issues                                                                                    
      except json.JSONDecodeError:
        pass

      return []

     
