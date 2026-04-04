import requests
import base64

class GitHubTool:
    def __init__(self, token: str, repo: str):
        self.repo = repo # "owner/repo format"
        self.headers = {"Authorization": f"Bearer {token}"}
        self.base_url = f"https://api.github.com/repos/{repo}"
    
    def _should_skip(self, path: str) -> bool:
        SKIP_DIRS = ("node_modules/", ".git/", "dist/", "build/", "__pycache__/", ".next/", "venv/", ".venv/")                                                                        
        SKIP_EXTENSIONS = (".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico", ".pdf", ".zip", ".tar", ".gz", ".whl", ".pyc")                                                            
        SKIP_FILENAMES = ("package-lock.json", "yarn.lock", "poetry.lock", "Pipfile.lock", "pnpm-lock.yaml")    
        
        if any(path.startswith(dir) for dir in SKIP_DIRS):
            return True
        if path.endswith(SKIP_EXTENSIONS):
            return True
        if path.split("/")[-1] in SKIP_FILENAMES:
            return True
        return False

    def get_file_tree(self) -> list[str]:
        url = f"{self.base_url}/git/trees/main?recursive=1"
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        tree = response.json().get("tree")
        return [item["path"] for item in tree if item["type"] == "blob" and not self._should_skip(item["path"])]
    
    def get_file_content(self, path: str) -> str:
        url = f"{self.base_url}/contents/{path}"
        response = requests.get(url, headers=self.headers)
        response.raise_for_status()
        content = response.json().get("content")
        return base64.b64decode(content).decode("utf-8")