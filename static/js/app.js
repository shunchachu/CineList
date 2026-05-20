const IMAGE_BASE_URL = "[https://image.tmdb.org/t/p/w500](https://image.tmdb.org/t/p/w500)";

document.addEventListener('DOMContentLoaded', () => {
    loadWeeklyVote();
    loadJournal();
});

function switchTab(tabName, event) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`${tabName}-section`).classList.add('active');
    event.target.classList.add('active');
}

async function loadWeeklyVote() {
    try {
        const response = await fetch('/api/weekly-vote');
        const data = await response.json();
        
        document.getElementById('theme-title').innerText = data.theme;
        const grid = document.getElementById('vote-grid');
        grid.innerHTML = '';

        const totalVotes = data.candidates.reduce((sum, c) => sum + c.votes, 0);

        data.candidates.forEach(movie => {
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
    } catch (err) { console.error("無法加載投票數據:", err); }
}

async function castVote(movieId) {
    try {
        const res = await fetch('/api/vote', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ movie_id: movieId })
        });
        if (res.ok) loadWeeklyVote();
    } catch (err) { console.error("投票失敗:", err); }
}

async function searchMovies() {
    const query = document.getElementById('search-input').value.trim();
    if (!query) return;
    
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = '<p style="padding:20px; color:var(--text-muted); grid-column: 1/-1; text-align:center;">搜尋中...</p>';

    try {
        const res = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
        const data = await res.json();
        resultsContainer.innerHTML = '';
        
        if (!data.results || data.results.length === 0) {
            resultsContainer.innerHTML = '<p style="padding:20px; color:var(--text-muted); grid-column: 1/-1; text-align:center;">未找到相關電影項目</p>';
            return;
        }

        data.results.forEach(m => {
            const posterUrl = m.poster_path ? `${IMAGE_BASE_URL}${m.poster_path}` : '[https://via.placeholder.com/500x750?text=No+Poster](https://via.placeholder.com/500x750?text=No+Poster)';
            const year = m.release_date ? m.release_date.split('-')[0] : '未知';
            
            const card = document.createElement('div');
            card.className = 'movie-card';
            card.innerHTML = `
                <div class="poster-container">
                    <img class="poster-img" src="${posterUrl}" alt="${m.title}">
                </div>
                <div class="movie-info">
                    <div class="movie-title">${m.title} (${year})</div>
                    <button class="vote-btn" style="background-color:#3f3f46;" onclick="openJournalForm('${m.id}', \`${m.title.replace(/`/g, "\\`").replace(/'/g, "\\'")}\`, '${m.poster_path || ''}')">＋新增日誌</button>
                </div>
            `;
            resultsContainer.appendChild(card);
        });
    } catch (err) {
        console.error("搜尋發生錯誤:", err);
        resultsContainer.innerHTML = '<p style="padding:20px; color:var(--accent-red); grid-column: 1/-1; text-align:center;">搜尋連線失敗</p>';
    }
}

async function openJournalForm(id, title, posterPath) {
    const ratingStr = prompt(`請評分《${title}》\n(請輸入數字 1 至 5 顆星):`, "5");
    if (ratingStr === null) return;
    const rating = parseInt(ratingStr);
    
    if (isNaN(rating) || rating < 1 || rating > 5) {
        alert("評分不合規範，請輸入 1 到 5 之間的整數！");
        return;
    }
    
    const review = prompt(`請寫下對《${title}》的短評與心得觀點:`);
    if (review === null || review.trim() === "") {
        alert("短評內容不可為空！");
        return;
    }

    try {
        const res = await fetch('/api/journal', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ movie_id: id, title: title, poster_path: posterPath, rating: rating, review: review })
        });
        if (res.ok) {
            alert("已成功加入觀影日誌！");
            loadJournal();
        }
    } catch (err) { console.error("儲存日誌發生錯誤:", err); }
}

async function loadJournal() {
    const container = document.getElementById('journal-container');
    try {
        const res = await fetch('/api/journal');
        const data = await res.json();
        
        container.innerHTML = '';
        if (data.length === 0) {
            container.innerHTML = '<p style="color: var(--text-muted); padding: 10px 0;">目前尚無紀錄。快使用上方搜尋新增吧！</p>';
            return;
        }

        data.forEach(item => {
            const stars = '★'.repeat(item.rating) + '☆'.repeat(5 - item.rating);
            const posterUrl = item.poster_path ? `${IMAGE_BASE_URL}${item.poster_path}` : '[https://via.placeholder.com/100x150?text=No+Poster](https://via.placeholder.com/100x150?text=No+Poster)';
            
            container.innerHTML += `
                <div class="journal-item">
                    <img class="journal-thumb" src="${posterUrl}">
                    <div class="journal-content">
                        <div class="journal-header">
                            <strong style="font-size:1.15rem; color:#ffffff;">${item.title}</strong>
                            <span class="stars">${stars}</span>
                        </div>
                        <p style="color: #d1d5db; line-height:1.6; margin-bottom:12px; font-size:0.95rem;">${item.review}</p>
                        <button class="btn-share" onclick="shareToIG('${item.title}', '${posterUrl}', ${item.rating}, \`${item.review.replace(/`/g, "\\`").replace(/'/g, "\\'")}\`)">✨ 產生 IG 限動分享圖</button>
                    </div>
                </div>
            `;
        });
    } catch (err) { console.error("載入日誌錯誤:", err); }
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
