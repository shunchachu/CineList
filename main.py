import os
import sqlite3
from fastapi import FastAPI, Request, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
import httpx

app = FastAPI(title="Bucket List Cinema API", version="1.0.0")

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

TMDB_API_KEY = os.getenv("TMDB_API_KEY", "YOUR_TMDB_API_KEY_HERE")
TMDB_BASE_URL = "[https://api.themoviedb.org/3](https://api.themoviedb.org/3)"
DB_PATH = "cinema.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS votes (
            movie_id TEXT PRIMARY KEY,
            title TEXT,
            poster_path TEXT,
            vote_count INTEGER DEFAULT 0
        )
    ''')
    c.execute('''
        CREATE TABLE IF NOT EXISTS journal (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            movie_id TEXT,
            title TEXT,
            poster_path TEXT,
            rating INTEGER,
            review TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()

    c.execute("SELECT COUNT(*) FROM votes")
    if c.fetchone()[0] == 0:
        candidates = [
            ("508442", "靈魂急轉彎 (Soul)", "/hm58Z4vWZrl6xiY7qtCI97wgrp6.jpg", 18),
            ("105156", "命運石之門 負荷領域的既視感", "/itZcoP66B2490N0Y9jNidN80R07.jpg", 14),
            ("44048", "秒速5公分", "/6pqw8n990YfCOZVA98p8Y67nEa3.jpg", 11),
            ("378064", "聲之形", "/77N89gIe6vS0wNf879Y5WwwasAs.jpg", 16),
            ("372058", "你的名字。", "/q719jXXEzOoY2gcoKqney9hn62M.jpg", 25)
        ]
        c.executemany("INSERT INTO votes (movie_id, title, poster_path, vote_count) VALUES (?, ?, ?, ?)", candidates)
        conn.commit()
    conn.close()

init_db()

class VoteRequest(BaseModel):
    movie_id: str

class JournalRequest(BaseModel):
    movie_id: str
    title: str
    poster_path: str
    rating: int
    review: str

@app.get("/")
async def render_index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/api/search")
async def search_movie(query: str = Query(..., min_length=1)):
    if TMDB_API_KEY == "YOUR_TMDB_API_KEY_HERE" or not TMDB_API_KEY:
        return {
            "results": [
                {"id": "508442", "title": "靈魂急轉彎 (Soul)", "poster_path": "/hm58Z4vWZrl6xiY7qtCI97wgrp6.jpg", "release_date": "2020-12-25"},
                {"id": "105156", "title": "命運石之門 負荷領域的既視感", "poster_path": "/itZcoP66B2490N0Y9jNidN80R07.jpg", "release_date": "2013-04-20"},
                {"id": "44048", "title": "秒速5公分", "poster_path": "/6pqw8n990YfCOZVA98p8Y67nEa3.jpg", "release_date": "2007-03-03"}
            ]
        }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{TMDB_BASE_URL}/search/movie",
                params={"api_key": TMDB_API_KEY, "query": query, "language": "zh-TW"}
            )
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="TMDB API 請求失敗")
            return response.json()
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/weekly-vote")
def get_weekly_vote():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT movie_id, title, poster_path, vote_count FROM votes")
    rows = c.fetchall()
    conn.close()
    
    candidates = [{"movie_id": r[0], "title": r[1], "poster_path": r[2], "votes": r[3]} for r in rows]
    return {
        "theme": "本週粉絲策展主題：探討生命意義與存在價值的動畫神作",
        "candidates": candidates
    }

@app.post("/api/vote")
def cast_vote(payload: VoteRequest):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("UPDATE votes SET vote_count = vote_count + 1 WHERE movie_id = ?", (payload.movie_id,))
    conn.commit()
    conn.close()
    return {"status": "success"}

@app.get("/api/journal")
def get_journal():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT movie_id, title, poster_path, rating, review, created_at FROM journal ORDER BY created_at DESC")
    rows = c.fetchall()
    conn.close()
    return [
        {"movie_id": r[0], "title": r[1], "poster_path": r[2], "rating": r[3], "review": r[4], "created_at": r[5]}
        for r in rows
    ]

@app.post("/api/journal")
def add_journal_entry(payload: JournalRequest):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute(
        "INSERT INTO journal (movie_id, title, poster_path, rating, review) VALUES (?, ?, ?, ?, ?)",
        (payload.movie_id, payload.title, payload.poster_path, payload.rating, payload.review)
    )
    conn.commit()
    conn.close()
    return {"status": "success"}
