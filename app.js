document.addEventListener("DOMContentLoaded", () => {
  const artworksDiv = document.getElementById("artworks");
  const calcMode = document.getElementById("calcMode");
  const extraSettings = document.getElementById("extraSettings");
  const edgeInputGroup = document.getElementById("edgeInputGroup");
  const gapInputGroup = document.getElementById("gapInputGroup");

  // 作品追加ボタンをグローバルに公開
  window.addArtwork = function(value = "") {
    const wrapper = document.createElement("div");
    wrapper.style.display = "flex";
    wrapper.style.gap = "6px";
    wrapper.style.marginBottom = "6px";

    const input = document.createElement("input");
    input.type = "number";
    input.placeholder = "作品幅";
    input.value = value;
    input.inputMode = "decimal";
    input.oninput = calculate;

    const del = document.createElement("button");
    del.innerText = "×";
    del.type = "button";
    del.onclick = () => {
      wrapper.remove();
      calculate();
    };

    wrapper.appendChild(input);
    wrapper.appendChild(del);
    artworksDiv.appendChild(wrapper);
  };

  function updateUI() {
    const mode = calcMode.value;
    extraSettings.style.display = mode === "even" ? "none" : "block";
    edgeInputGroup.style.display = mode === "fixEdge" ? "block" : "none";
    gapInputGroup.style.display = mode === "fixGap" ? "block" : "none";
    calculate();
  }

  function calculate() {
    const wall = parseFloat(document.getElementById("wallWidth").value);
    const mode = calcMode.value;
    const edgeVal = parseFloat(document.getElementById("edgeWidth").value) || 0;
    const midGapVal = parseFloat(document.getElementById("midGapWidth").value) || 0;

    const inputs = artworksDiv.querySelectorAll("input");
    const artworks = Array.from(inputs).map(i => parseFloat(i.value)).filter(v => !isNaN(v));

    const errorDiv = document.getElementById("error");
    const gapDiv = document.getElementById("gap");
    errorDiv.innerText = "";
    gapDiv.innerText = "";

    if (!wall || artworks.length === 0) return;

    const totalArtWidth = artworks.reduce((a, b) => a + b, 0);
    let gapStart, gapMid;

    if (mode === "even") {
      gapStart = gapMid = (wall - totalArtWidth) / (artworks.length + 1);
    } else if (mode === "fixEdge") {
      const gapCount = artworks.length - 1;
      gapStart = edgeVal;
      gapMid = gapCount > 0 ? (wall - totalArtWidth - (edgeVal * 2)) / gapCount : 0;
    } else if (mode === "fixGap") {
      const gapCount = artworks.length - 1;
      gapMid = midGapVal;
      gapStart = (wall - totalArtWidth - (midGapVal * gapCount)) / 2;
    }

    if (gapStart < 0 || gapMid < 0) {
      errorDiv.innerText = "設定値が壁の幅を超えています";
      return;
    }

    gapDiv.innerHTML = mode === "even" 
      ? `余白：${gapStart.toFixed(1)} mm` 
      : `端：${gapStart.toFixed(1)} mm / 中：${gapMid.toFixed(1)} mm`;

    draw(wall, artworks, gapStart, gapMid);
  }

  function draw(wall, artworks, gapStart, gapMid) {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scale = canvas.width / wall;
    let x = gapStart * scale;

    artworks.forEach((w, i) => {
      const width = w * scale;
      ctx.fillStyle = "#333";
      ctx.fillRect(x, 50, width, 30);
      ctx.fillStyle = "white";
      ctx.font = "10px sans-serif";
      ctx.fillText(String.fromCharCode(65 + i), x + 4, 70);
      ctx.fillStyle = "black";
      ctx.fillText(`${w}`, x, 45);
      ctx.fillStyle = "blue";
      const dGap = (i === 0) ? gapStart : gapMid;
      ctx.fillText(`${dGap.toFixed(0)}`, x - (dGap * scale) / 2 - 5, 105);
      x += width + (gapMid * scale);
    });
    ctx.fillStyle = "blue";
    ctx.fillText(`${gapStart.toFixed(0)}`, canvas.width - (gapStart * scale) / 2 - 5, 105);
  }

  // 初期実行
  calcMode.addEventListener("change", updateUI);
  document.getElementById("wallWidth").addEventListener("input", calculate);
  document.getElementById("edgeWidth").addEventListener("input", calculate);
  document.getElementById("midGapWidth").addEventListener("input", calculate);
  
  addArtwork();
  addArtwork();
});