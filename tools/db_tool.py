from datetime import datetime
from models.crawl_job import CrawlJob, CrawlStatus
from models.issue import Issue

class DBTool:
    def __init__(self, db_session):
        self.db = db_session

    def update_crawl_job(self, job_id: int, status: CrawlStatus, error_message: str = None):
        job = self.db.query(CrawlJob).filter(CrawlJob.id == job_id).first()
        if job:
            job.status = status
            if status == CrawlStatus.running:
                job.started_at = datetime.utcnow()
            elif status in (CrawlStatus.completed, CrawlStatus.failed):
                job.completed_at = datetime.utcnow()
                if error_message:
                    job.error_message = error_message
            self.db.commit()
    
    def save_issue(self, repository_id: int, title: str, description: str, severity: str, category: str, file_path: str, line_number: int):
        issue = Issue(
            repository_id=repository_id,
            title=title,
            description=description,
            severity=severity,
            category=category,
            file_path=file_path,
            line_number=line_number
        )
        self.db.add(issue)
        self.db.commit()
    
    def clear_issues(self, repository_id: int):
        self.db.query(Issue).filter(Issue.repository_id == repository_id).delete()
        self.db.commit()

    def save_issues_bulk(self, repository_id: int, issues: list[dict]):
        issue_objects = [
            Issue(
                repository_id=repository_id,
                title=issue["title"],
                description=issue["description"],
                severity=issue["severity"],
                category=issue["category"],
                file_path=issue.get("file_path"),
                line_number=issue.get("line_number")
            )
            for issue in issues
        ]
        self.db.bulk_save_objects(issue_objects)
        self.db.commit()