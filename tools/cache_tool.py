import redis
import json
import os
from dotenv import load_dotenv

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL")

class CacheTool:
    def __init__(self):
        self.client = redis.from_url(os.getenv("REDIS_URL", "redis://redis:6379"))

    def get(self, key):
        value = self.client.get(key)
        if value is None:
            return None
        return json.loads(value)
 
    def set(self, key, value, ttl=86400):
        self.client.setex(key, ttl, json.dumps(value))



