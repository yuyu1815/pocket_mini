import Head from 'next/head'
import { useEffect } from 'react'

export default function Home() {
  useEffect(() => {
    // クライアント側ロジック(app.js)をそのまま動かす
    // window 依存のため動的に読み込む
    const s = document.createElement('script')
    s.src = '/app.js'
    s.async = false
    document.body.appendChild(s)
    return () => { s.remove() }
  }, [])

  return (
    <>
      <Head>
        <title>PocketMini - 後で読む</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="stylesheet" href="/style.css" />
      </Head>
      <div id="__legacy-root" dangerouslySetInnerHTML={{ __html: `
        ${html}
      `}} />
    </>
  )
}

const html = `
  <div class="container">
    <header class="header">
      <h1>PocketMini</h1>
      <p class="subtitle">後で読む・タグで整理</p>
    </header>

    <div class="bookmarklet-section" id="bookmarkletSection" style="display: none;">
      <h3>📚 ブックマークレット</h3>
      <p>以下のボタンをブラウザのブックマークバーにドラッグして、任意のページで実行してください：</p>
      <div class="bookmarklet-container">
        <a href="javascript:(function(){var u=encodeURIComponent(location.href);var t=encodeURIComponent(document.title);window.open(location.origin+location.pathname+'?add='+u+'&title='+t,'_blank');})();" class="bookmarklet-button">📖 PocketMiniに保存</a>
      </div>
      <button class="close-btn" onclick="toggleBookmarklet()">×</button>
    </div>

    <div class="controls">
      <div class="add-form">
        <input type="url" id="urlInput" placeholder="URLを入力..." required>
        <input type="text" id="titleInput" placeholder="タイトル（自動取得）">
        <input type="text" id="tagsInput" placeholder="タグ（カンマ区切り）">
        <button onclick="addBookmark()">保存</button>
      </div>

      <div class="filters">
        <input type="text" id="searchInput" placeholder="検索..." oninput="filterBookmarks()">
        <select id="tagFilter" onchange="filterBookmarks()">
          <option value="">すべてのタグ</option>
        </select>
        <div class="view-toggle">
          <label>
            <input type="radio" name="view" value="active" checked onchange="switchView()">
            アクティブ
          </label>
          <label>
            <input type="radio" name="view" value="archived" onchange="switchView()">
            アーカイブ
          </label>
        </div>
      </div>

      <div class="data-controls">
        <button onclick="toggleBookmarklet()">ブックマークレット</button>
        <button onclick="exportData()">エクスポート</button>
        <label class="file-label">
          インポート
          <input type="file" id="importFile" accept=".json" onchange="importData()" hidden>
        </label>
      </div>
    </div>

    <div class="bookmarks-list" id="bookmarksList"></div>

    <div class="status" id="status"></div>
  </div>

  <div class="toast" id="toast"></div>
`;
