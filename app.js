document.addEventListener("DOMContentLoaded", () => {
  const artworksDiv = document.getElementById("artworks");
  const calcMode = document.getElementById("calcMode");
  const historyList = document.getElementById("historyList");
  let currentApp = 'kinto'; // 現在のモードを追跡
  let lockedGaps = {};

  // --- 履歴機能 (均等割り & ビス位置 両対応) ---
  window.saveCurrentData = function() {
    const nameInput = document.getElementById("saveName");
    const name = nameInput.value || "名称未設定";
    const date = new Date().toLocaleString('ja-JP', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' });
    
    let data = {
      app: currentApp,
      name: name,
      date: date
    };

    if (currentApp === 'kinto') {
      // 均等割りのデータを収集
      data.wallWidth = document.getElementById("wallWidth").value;
      data.calcMode = calcMode.value;
      data.edgeWidth = document.getElementById("edgeWidth").value;
      data.midGapWidth = document.getElementById("midGapWidth").value;
      data.groupGapWidth = document.getElementById("groupGapWidth").value;
      data.artworks = Array.from(artworksDiv.querySelectorAll(".art-width-input")).map(i => i.value);
      data.groupFlags = Array.from(artworksDiv.querySelectorAll(".group-check")).map(i => i.checked);
    } else {
      // ビス位置くんのデータを収集
      data.centerLine = document.getElementById("centerLine").value;
      data.artHeight = document.getElementById("artHeight").value;
      data.bisFromTop = document.getElementById("bisFromTop").value;
      data.artWidth = document.getElementById("artWidth").value;
      data.bisPreset = document.getElementById("bisPreset").value;
    }

    let history = JSON.parse(localStorage.getItem("kintoHistory") || "[]");
    history.unshift(data);
    if(history.length > 15) history.pop(); // 少し件数を増やして15件に
    localStorage.setItem("kintoHistory", JSON.stringify(history));
    
    renderHistory();
    nameInput.value = "";
    alert(`${currentApp === 'kinto' ? '均等割り' : 'ビス位置'}を保存しました`);
  };

  function renderHistory() {
    const history = JSON.parse(localStorage.getItem("kintoHistory") || "[]");
    historyList.innerHTML = history.length ? "" : "<p style='font-size:0.8rem;color:#94a3b8;text-align:center;'>履歴はありません</p>";
    
    history.forEach((item, index) => {
      const div = document.createElement("div");
      div.className = "history-item";
      const typeLabel = item.app === 'kinto' ? '<span style="color:#2563eb">[均]</span>' : '<span style="color:#dc2626">[ビス]</span>';
      const detail = item.app === 'kinto' ? `壁:${item.wallWidth} / ${item.artworks.length}点` : `作品H:${item.artHeight} / CL:${item.centerLine}`;
      
      div.innerHTML = `
        <div class="history-info" onclick="loadHistory(${index})">
          <span class="history-name">${typeLabel} ${item.name}</span>
          <span class="history-meta">${item.date} / ${detail}</span>
        </div>
        <button class="btn-history-del" onclick="deleteHistory(${index})">
          <span class="material-icons-round" style="font-size:18px">delete_outline</span>
        </button>
      `;
      historyList.appendChild(div);
    });
  }

  window.loadHistory = function(index) {
    const history = JSON.parse(localStorage.getItem("kintoHistory") || "[]");
    const item = history[index];
    if (!item) return;

    if (item.app === 'kinto') {
      switchApp('kinto');
      document.getElementById("wallWidth").value = item.wallWidth;
      calcMode.value = item.calcMode;
      document.getElementById("edgeWidth").value = item.edgeWidth;
      document.getElementById("midGapWidth").value = item.midGapWidth;
      document.getElementById("groupGapWidth").value = item.groupGapWidth;
      artworksDiv.innerHTML = "";
      item.artworks.forEach((w, i) => addArtwork(w, item.groupFlags[i]));
      calculateKinto();
    } else {
      switchApp('bis');
      document.getElementById("centerLine").value = item.centerLine;
      document.getElementById("artHeight").value = item.artHeight;
      document.getElementById("bisFromTop").value = item.bisFromTop;
      document.getElementById("artWidth").value = item.artWidth;
      document.getElementById("bisPreset").value = item.bisPreset;
      calcBis();
    }
  };

  window.deleteHistory = function(index) {
    let history = JSON.parse(localStorage.getItem("kintoHistory") || "[]");
    history.splice(index, 1);
    localStorage.setItem("kintoHistory", JSON.stringify(history));
    renderHistory();
  };

  // --- アプリ切り替え ---
  window.switchApp = function(app) {
    currentApp = app;
    document.getElementById('app-kinto').style.display = app === 'kinto' ? 'block' : 'none';
    document.getElementById('app-bis').style.display = app === 'bis' ? 'block' : 'none';
    document.getElementById('btn-kinto').classList.toggle('active', app === 'kinto');
    document.getElementById('btn-bis').classList.toggle('active', app === 'bis');
    // 保存ボタンの横の入力欄をリセット（混同防止）
    document.getElementById("saveName").placeholder = app === 'kinto' ? "場所・壁面名（例：A壁）" : "作品名（例：No.1）";
  };

  // --- 以下、既存のロジック (均等割り・描画系) ---
  // ※前回の calculateKinto, drawKinto, calcBis, drawBis, addArtwork などをここに統合してください。
  // 注意：addArtwork内の calculateKinto() 呼び出しなども忘れずに。

  window.addArtwork = function(value = "", isChecked = false) {
    const wrapper = document.createElement("div");
    wrapper.className = "art-input-row";
    wrapper.innerHTML = `
      <input type="number" class="art-width-input" placeholder="幅" value="${value}" inputmode="decimal">
      <label class="group-check-label">
        <input type="checkbox" class="group-check" ${isChecked ? "checked" : ""}>
        <span>連</span>
      </label>
      <button type="button" class="btn-delete"><span class="material-icons-round" style="font-size:20px">delete</span></button>
    `;
    wrapper.querySelector(".art-width-input").oninput = calculateKinto;
    wrapper.querySelector(".group-check").onchange = calculateKinto;
    wrapper.querySelector(".btn-delete").onclick = () => { wrapper.remove(); calculateKinto(); };
    artworksDiv.appendChild(wrapper);
    calculateKinto();
  };

  // 描画・計算ロジック（省略せずに以前のものをそのまま使用してください）
  // ...
});