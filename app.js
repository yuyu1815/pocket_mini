/**
 * PocketMini - 後で読むアプリ
 * ローカルストレージベースのMVP実装
 */

var STORAGE_KEY = 'pocket-mini';
var appState = {
    bookmarks: [],
    lastExportAt: null
};

var currentView = 'active';
var filteredBookmarks = [];
var isInitialized = false;

// 初期化
function initializeApp() {
    if (!isInitialized) {
        isInitialized = true;
        loadData();
        checkURLParams();
        renderBookmarks();
        updateTagFilter();
        updateStatus();
    }
}

// DOMContentLoadedイベントリスナーを1回だけ追加
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOMContentLoadedが既に発火済みの場合
    initializeApp();
}

// データ読み込み
function loadData() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            appState = JSON.parse(stored);
            // データ構造の検証
            if (!Array.isArray(appState.bookmarks)) {
                appState.bookmarks = [];
            }
        }
    } catch (error) {
        console.error('データ読み込みエラー:', error);
        appState = { bookmarks: [], lastExportAt: null };
    }
}

// データ保存
function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(appState));
    } catch (error) {
        console.error('データ保存エラー:', error);
        showToast('ストレージ容量が不足しています。古い項目をアーカイブまたは削除してください。', 'error');
    }
}

// URL パラメータ処理（ブックマークレット用）
function checkURLParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const addURL = urlParams.get('add');
    const title = urlParams.get('title');
    
    console.log('checkURLParams called:', { addURL, title });
    
    if (addURL) {
        const urlInput = document.getElementById('urlInput');
        const titleInput = document.getElementById('titleInput');
        
        if (!urlInput || !titleInput) {
            setTimeout(checkURLParams, 100);
            return;
        }
        
        // URL入力欄に設定（エンコードされたまま保存）
        urlInput.value = addURL;
        if (title) {
            titleInput.value = decodeURIComponent(title);
        } else {
            // タイトルが渡されていない場合は、URLからホスト名を自動設定
            try {
                const urlObj = new URL(decodeURIComponent(addURL));
                titleInput.value = urlObj.hostname;
            } catch (e) {
                // URL解析に失敗した場合は空のまま
            }
        }
        
        // 自動保存
        setTimeout(() => {
            if (urlInput.value.trim()) {
                addBookmark();
                // URLパラメータをクリア
                window.history.replaceState({}, document.title, window.location.pathname);
            }
        }, 100);
    }
}

// ブックマーク追加
function addBookmark() {
    console.log('addBookmark called');
    const urlInput = document.getElementById('urlInput');
    const titleInput = document.getElementById('titleInput');
    const tagsInput = document.getElementById('tagsInput');
    
    if (!urlInput) {
        showToast('URL入力欄が見つかりません', 'error');
        return;
    }
    
    let url = urlInput.value.trim();
    
    console.log('URL to add:', url);
    
    if (!url) {
        showToast('URLを入力してください', 'error');
        return;
    }
    
    // URLをデコードしてから検証
    try {
        url = decodeURIComponent(url);
    } catch (e) {
        // URL解析に失敗した場合は元のURLを使用
    }
    
    // 簡易URL検証（デコード後）
    if (!url.match(/^https?:\/\/.+/)) {
        showToast('有効なURLを入力してください（http://またはhttps://）', 'error');
        return;
    }
    
    let title = titleInput.value.trim();
    if (!title) {
        // URLからホスト名を抽出
        try {
            const urlObj = new URL(url);
            title = urlObj.hostname;
        } catch (e) {
            title = url;
        }
    }
    
    const tags = tagsInput.value.split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
    
    // 重複チェック（同じURLがあれば更新）
    const existingIndex = appState.bookmarks.findIndex(b => b.url === url);
    
    const bookmark = {
        id: existingIndex >= 0 ? appState.bookmarks[existingIndex].id : generateId(),
        url: url,
        title: title,
        tags: tags,
        createdAt: new Date().toISOString(),
        archived: false
    };
    
    if (existingIndex >= 0) {
        appState.bookmarks[existingIndex] = bookmark;
        showToast('ブックマークを更新しました', 'success');
        console.log('Bookmark updated:', bookmark);
    } else {
        appState.bookmarks.unshift(bookmark);
        showToast('ブックマークを保存しました', 'success');
        console.log('Bookmark added:', bookmark);
    }
    
    saveData();
    renderBookmarks();
    updateTagFilter();
    updateStatus();
    
    // ブックマークレットからの保存完了を通知
    if (window.opener) {
        window.opener.postMessage({ type: 'bookmarkSaved', success: true }, '*');
    }
    
    // フォームクリア
    urlInput.value = '';
    titleInput.value = '';
    tagsInput.value = '';
}

// ID生成
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 表示切替
function switchView() {
    const viewRadios = document.getElementsByName('view');
    for (const radio of viewRadios) {
        if (radio.checked) {
            currentView = radio.value;
            break;
        }
    }
    renderBookmarks();
    updateStatus();
}

// ブックマーク絞り込み
function filterBookmarks() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const tagFilter = document.getElementById('tagFilter').value;
    
    filteredBookmarks = appState.bookmarks.filter(bookmark => {
        // アーカイブ状態でフィルタ
        if (currentView === 'active' && bookmark.archived) return false;
        if (currentView === 'archived' && !bookmark.archived) return false;
        
        // 検索文字列でフィルタ
        if (searchTerm) {
            const searchableText = (bookmark.title + ' ' + bookmark.url + ' ' + bookmark.tags.join(' ')).toLowerCase();
            if (!searchableText.includes(searchTerm)) return false;
        }
        
        // タグでフィルタ
        if (tagFilter) {
            if (!bookmark.tags.includes(tagFilter)) return false;
        }
        
        return true;
    });
    
    renderBookmarksList();
}

// ブックマーク表示
function renderBookmarks() {
    filterBookmarks();
    renderBookmarksList();
}

// ブックマーク一覧描画（フィルタリング済み）
function renderBookmarksList() {
    const container = document.getElementById('bookmarksList');
    
    if (filteredBookmarks.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <p>${currentView === 'active' ? 'アクティブな' : 'アーカイブされた'}ブックマークがありません</p>
            </div>
        `;
        return;
    }
    
    const html = filteredBookmarks.map(bookmark => {
        const domain = extractDomain(bookmark.url);
        const formattedDate = formatDate(bookmark.createdAt);
        const tagsHtml = bookmark.tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join('');
        
        return `
            <div class="bookmark-item" data-id="${bookmark.id}">
                <div class="bookmark-content" onclick="openUrl('${bookmark.url}')">
                    <h3 class="bookmark-title">${escapeHtml(bookmark.title)}</h3>
                    <div class="bookmark-meta">
                        <span class="bookmark-domain">${escapeHtml(domain)}</span>
                        <span class="bookmark-date">${formattedDate}</span>
                    </div>
                    ${tagsHtml ? `<div class="bookmark-tags">${tagsHtml}</div>` : ''}
                </div>
                <div class="bookmark-actions">
                    <button class="btn-archive" onclick="toggleArchive('${bookmark.id}')" title="${bookmark.archived ? 'アンアーカイブ' : 'アーカイブ'}">
                        ${bookmark.archived ? '📂' : '📁'}
                    </button>
                    <button class="btn-delete" onclick="deleteBookmark('${bookmark.id}')" title="削除">🗑️</button>
                </div>
            </div>
        `;
    }).join('');
    
    container.innerHTML = html;
}

// ドメイン抽出
function extractDomain(url) {
    try {
        return new URL(url).hostname;
    } catch (e) {
        return url;
    }
}

// 日付フォーマット
function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// HTML エスケープ
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// URL を新規タブで開く
function openUrl(url) {
    window.open(url, '_blank');
}

// アーカイブ切替
function toggleArchive(id) {
    const bookmark = appState.bookmarks.find(b => b.id === id);
    if (bookmark) {
        bookmark.archived = !bookmark.archived;
        saveData();
        renderBookmarks();
        updateStatus();
        showToast(bookmark.archived ? 'アーカイブしました' : 'アンアーカイブしました', 'success');
    }
}

// ブックマーク削除
function deleteBookmark(id) {
    if (confirm('このブックマークを削除しますか？')) {
        appState.bookmarks = appState.bookmarks.filter(b => b.id !== id);
        saveData();
        renderBookmarks();
        updateTagFilter();
        updateStatus();
        showToast('削除しました', 'success');
    }
}

// タグフィルター更新
function updateTagFilter() {
    const tagFilter = document.getElementById('tagFilter');
    const allTags = new Set();
    
    appState.bookmarks.forEach(bookmark => {
        bookmark.tags.forEach(tag => allTags.add(tag));
    });
    
    const sortedTags = Array.from(allTags).sort();
    const currentValue = tagFilter.value;
    
    tagFilter.innerHTML = '<option value="">すべてのタグ</option>' +
        sortedTags.map(tag => `<option value="${escapeHtml(tag)}">${escapeHtml(tag)}</option>`).join('');
    
    // 現在の選択値を復元
    if (sortedTags.includes(currentValue)) {
        tagFilter.value = currentValue;
    }
}

// ステータス更新
function updateStatus() {
    const activeCount = appState.bookmarks.filter(b => !b.archived).length;
    const archivedCount = appState.bookmarks.filter(b => b.archived).length;
    const filteredCount = filteredBookmarks.length;
    
    document.getElementById('status').textContent = 
        `アクティブ: ${activeCount}件, アーカイブ: ${archivedCount}件, 表示中: ${filteredCount}件`;
}

// ブックマークレット表示切替
function toggleBookmarklet() {
    const section = document.getElementById('bookmarkletSection');
    section.style.display = section.style.display === 'none' ? 'block' : 'none';
    
    // ブックマークレットを動的に生成
    if (section.style.display === 'block') {
        generateBookmarklet();
    }
}

// ブックマークレット生成
function generateBookmarklet() {
    const bookmarkletLink = document.getElementById('bookmarkletLink');
    const currentBase = window.location.origin + window.location.pathname;
    
    const bookmarkletCode = `javascript:(function(){var currentUrl=encodeURIComponent(window.location.href);var currentTitle=encodeURIComponent(document.title);var base='${currentBase}';console.log('Opening:',base+'?add='+currentUrl+'&title='+currentTitle);var newTab=window.open(base+'?add='+currentUrl+'&title='+currentTitle,'_blank');window.addEventListener('message',function(e){if(e.data.type==='bookmarkSaved'&&e.data.success){if(newTab&&!newTab.closed){newTab.close();}}},false);setTimeout(function(){if(newTab&&!newTab.closed){newTab.close();}},5000);})();`;
    
    bookmarkletLink.href = bookmarkletCode;
}

// データエクスポート
function exportData() {
    try {
        appState.lastExportAt = new Date().toISOString();
        const dataStr = JSON.stringify(appState, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `pocket-mini-export-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        saveData();
        showToast('エクスポートしました', 'success');
    } catch (error) {
        console.error('エクスポートエラー:', error);
        showToast('エクスポートに失敗しました', 'error');
    }
}

// データインポート
function importData() {
    const file = document.getElementById('importFile').files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            // データ構造の検証
            if (!importedData.bookmarks || !Array.isArray(importedData.bookmarks)) {
                throw new Error('無効なファイル形式です');
            }
            
            // マージ処理（IDの重複は既存優先）
            const existingIds = new Set(appState.bookmarks.map(b => b.id));
            const newBookmarks = importedData.bookmarks.filter(b => !existingIds.has(b.id));
            
            appState.bookmarks.push(...newBookmarks);
            
            // 日付でソート
            appState.bookmarks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            saveData();
            renderBookmarks();
            updateTagFilter();
            updateStatus();
            
            showToast(`${newBookmarks.length}件のブックマークをインポートしました`, 'success');
        } catch (error) {
            console.error('インポートエラー:', error);
            showToast('インポートに失敗しました: ' + error.message, 'error');
        }
    };
    reader.readAsText(file);
    
    // ファイル選択をクリア
    document.getElementById('importFile').value = '';
}

// トースト通知
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    
    setTimeout(() => {
        toast.className = 'toast';
    }, 3000);
}

// キーボードショートカット
document.addEventListener('keydown', function(e) {
    // Ctrl+S または Cmd+S でブックマーク保存
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        addBookmark();
    }
    
    // ESC でブックマークレット非表示
    if (e.key === 'Escape') {
        document.getElementById('bookmarkletSection').style.display = 'none';
    }
});