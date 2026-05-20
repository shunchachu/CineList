// 在這裡填入你的 TMDB API Key
const TMDB_API_KEY = "YOUR_TMDB_API_KEY_HERE"; 
const IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500";

document.addEventListener('DOMContentLoaded', () => {
    initLocalData();
    loadWeeklyVote();
    loadJournal();
});

// 初始化 LocalStorage 資料庫 (模擬後端)
function initLocalData() {
    if (!localStorage.getItem('cinema_votes')) {
        const seedVotes = [
            { movie_id: "508442", title: "靈魂急轉彎 (Soul)", poster_path: "/hm58Z4vWZrl6xiY7qtCI97wgrp6.jpg", votes: 18 },
            { movie_id: "105156", title: "命運石之門 負荷領域的既視感", poster_path: "/itZcoP66B2490N0Y9jNidN80R07.jpg", votes: 14 },
            { movie_id: "44048", title: "秒速5公分", poster_path: "/6pqw8n990YfCOZVA98p8Y67nEa3.jpg", votes: 11 },
            { movie_id: "378064", title: "聲之形", poster_path: "/77N89gIe6vS0wNf879Y5WwwasAs.jpg", votes: 16 },
            { movie_id: "372058", title: "你的名字。", poster_path: "/q719jXXEzOoY2gcoKqney9hn62M.jpg", votes: 25 }
        ];
        localStorage.setItem('cinema_votes', JSON.stringify(seedVotes));
    }
    if (!localStorage.getItem('cinema_journal')) {
        localStorage.setItem('cinema_journal', JSON.stringify([]));
    }
}

function switchTab(tabName, event) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`${tabName}-section`).classList.add('active');
    event.target.classList.add('active');
}

function loadWeeklyVote() {
    const candidates = JSON.parse(localStorage.getItem('cinema_votes'));
    const grid = document.getElementById('vote-grid');
    grid.innerHTML = '';

    const totalVotes = candidates.reduce((sum, c) => sum + c.votes, 0);

    candidates.forEach(movie => {
        const pct = totalVotes === 0 ? 0 : ((movie.votes / totalVotes) * 100).toFixed(1);
        const posterUrl = movie.poster_path.startsWith('http') ? movie.poster_path : `${IMAGE_BASE_URL}${movie.poster_path}`;

        grid.innerHTML += `
            <div class="movie-card">
                <div class="poster-container">
                    <img class="poster-img" src="${posterUrl}" alt="${movie.title}">
                </div>
                <div class="movie-info">
                    <div class="movie-title">${movie.title}</div>
                    <div>
                        <button class="vote-btn" onclick="castVote('${movie.movie_id}')">投票給它</button>
                        <div class="progress-wrapper">
                            <div class="progress-bar-bg">
                                <div class="progress-bar-fill" style="width: ${pct}%"></div>
                            </div>
                            <div class="vote-stats">
                                <span>${pct}%</span>
                                <span>${movie.votes} 票</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
}

function castVote(movieId) {
    let candidates = JSON.parse(localStorage.getItem('cinema_votes'));
    const index = candidates.findIndex(c => c.movie_id === movieId);
    if (index !== -1) {
        candidates[index].votes += 1;
        localStorage.setItem('cinema_votes', JSON.stringify(candidates));
        loadWeeklyVote(); // 重新渲染
    }
}

async function searchMovies() {
    const query = document.getElementById('search-input').value.trim();
    if (!query) return;
    
    if (TMDB_API_KEY === "YOUR_TMDB_API_KEY_HERE") {
        alert("請先在 js/app.js 中填寫您的 TMDB API Key 才可使用搜尋功能！");
        return;
    }

    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = '<p style="padding:20px; color:var(--text-muted); grid-column: 1/-1; text-align:center;">串接 TMDB 搜尋中...</p>';

    try {
        // 直接從前端 Call API
        const url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}&language=zh-TW`;
        const res = await fetch(url);
        const data = await res.json();
        
        resultsContainer.innerHTML = '';
        if (!data.results || data.results.length === 0) {
            resultsContainer.innerHTML = '<p style="padding:20px; color:var(--text-muted); grid-column: 1/-1; text-align:center;">未找到相關電影</p>';
            return;
        }

        data.results.forEach(m => {
            const posterUrl = m.poster_path ? `${IMAGE_BASE_URL}${m.poster_path}` : 'https://via.placeholder.com/500x750?text=No+Poster';
            const year = m.release_date ? m.release_date.split('-')[0] : '未知';
            
            const card = document.createElement('div');
            card.className = 'movie-card';
            card.innerHTML = `
                <div class="poster-container">
                    <img class="poster-img" src="${posterUrl}" alt="${m.title}">
                </div>
                <div class="movie-info">
                    <div class="movie-title">${m.title} (${year})</div>
                    <button class="vote-btn" style="background-color:#3f3f46;" onclick="openJournalForm('${m.id}', \`${m.title.replace(/`/g, "\`").replace(/'/g, "\'")}\`, '${m.poster_path || ''}')">＋新增日誌</button>
                </div>
            `;
            resultsContainer.appendChild(card);
        });
    } catch (err) {
        console.error("搜尋發生錯誤:", err);
        resultsContainer.innerHTML = '<p style="padding:20px; color:var(--accent-red); grid-column: 1/-1; text-align:center;">連線失敗</p>';
    }
}

function openJournalForm(id, title, posterPath) {
    const ratingStr = prompt(`請評分《${title}》\n(請輸入數字 1 至 5 顆星):`, "5");
    if (ratingStr === null) return;
    const rating = parseInt(ratingStr);
    
    if (isNaN(rating) || rating < 1 || rating > 5) {
        alert("評分不合規範，請輸入 1 到 5 之間的整數！");
        return;
    }
    
    const review = prompt(`請寫下對《${title}》的短評與心得觀點:`);
    if (review === null || review.trim() === "") return;

    const entry = { movie_id: id, title: title, poster_path: posterPath, rating: rating, review: review, created_at: new Date().toISOString() };
    
    let journal = JSON.parse(localStorage.getItem('cinema_journal'));
    journal.unshift(entry); // 加到最前面
    localStorage.setItem('cinema_journal', JSON.stringify(journal));
    
    alert("已成功加入觀影日誌！");
    loadJournal();
}

function loadJournal() {
    const container = document.getElementById('journal-container');
    const journal = JSON.parse(localStorage.getItem('cinema_journal'));
    
    container.innerHTML = '';
    if (journal.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted); padding: 10px 0;">目前尚無紀錄。快搜尋新增第一篇觀影心得吧！</p>';
        return;
    }

    journal.forEach(item => {
        const stars = '★'.repeat(item.rating) + '☆'.repeat(5 - item.rating);
        const posterUrl = item.poster_path ? `${IMAGE_BASE_URL}${item.poster_path}` : 'https://via.placeholder.com/100x150?text=No+Poster';
        
        container.innerHTML += `
            <div class="journal-item">
                <img class="journal-thumb" src="${posterUrl}">
                <div class="journal-content">
                    <div class="journal-header">
                        <strong style="font-size:1.15rem; color:#ffffff;">${item.title}</strong>
                        <span class="stars">${stars}</span>
                    </div>
                    <p style="color: #d1d5db; line-height:1.6; margin-bottom:12px; font-size:0.95rem;">${item.review}</p>
                    <button class="btn-share" onclick="shareToIG('${item.title}', '${posterUrl}', ${item.rating}, \`${item.review.replace(/`/g, "\`").replace(/'/g, "\'")}\`)">✨ 產生 IG 限動分享圖</button>
                </div>
            </div>
        `;
    });
}

function shareToIG(title, posterUrl, rating, review) {
    document.getElementById('share-title').innerText = title;
    document.getElementById('share-poster').src = posterUrl;
    document.getElementById('share-stars').innerText = '★'.repeat(rating);
    document.getElementById('share-review').innerText = review;
    document.getElementById('share-modal').style.display = 'flex';
}

function closeShareModal() {
    document.getElementById('share-modal').style.display = 'none';
}
