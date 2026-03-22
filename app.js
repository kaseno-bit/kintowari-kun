document.addEventListener("DOMContentLoaded", () => {
  const artworksDiv = document.getElementById("artworks");
  const calcMode = document.getElementById("calcMode");
  const extraSettings = document.getElementById("extraSettings");
  const edgeInputGroup = document.getElementById("edgeInputGroup");
  const gapInputGroup = document.getElementById("gapInputGroup");
  const edgeLabel = document.getElementById("edgeLabel");
  
  // スライド調整関連の要素
  const slideOffsetSlider = document.getElementById("slideOffset");
  const slideOffsetText = document.getElementById("slideOffsetText");

  // 作品追加ボタン
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
    edgeInputGroup.style.display = (mode === "fixEdge" || mode === "fixLeft" || mode === "fixRight") ? "block" : "none";
    gapInputGroup.style.display = mode === "fixGap" ? "block" : "none";

    if (mode === "fixLeft") edgeLabel.innerText = "左端の余白 (mm)";
    else if (mode === "fixRight") edgeLabel.innerText = "右端の余白 (mm)";
    else edgeLabel.innerText = "両端の余白 (mm)";

    calculate();
  }

  function calculate() {
    const wall = parseFloat(document.getElementById("wallWidth").value);
    const mode = calcMode.value;
    const edgeVal = parseFloat(document.getElementById("edgeWidth").value) || 0;
    const midGapVal = parseFloat(document.getElementById("midGapWidth").value) || 0;
    
    // スライド量の取得
    const slideOffset = parseFloat(slideOffsetText.value) || 0;

    const inputs = artworksDiv.querySelectorAll("input");
    const artworks = Array.from(inputs).map(i => parseFloat(i.value)).filter(v => !isNaN(v));

    const errorDiv = document.getElementById("error");
    const gapDiv = document.getElementById("gap");
    errorDiv.innerText = "";
    gapDiv.innerText = "";

    if (!wall || artworks.length === 0) return;

    const totalArtWidth = artworks.reduce((a, b) => a + b, 0);
    let gapLeft, gapMid, gapRight;

    // 基本の割り付け計算
    if (mode === "even") {
      gapLeft = gapMid = gapRight = (wall - totalArtWidth) / (artworks.length + 1);
    } else if (mode === "fixEdge") {
      gapLeft = gapRight = edgeVal;
      gapMid = (artworks.length > 1) ? (wall - totalArtWidth - (edgeVal * 2)) / (artworks.length - 1) : 0;
    } else if (mode === "fixGap") {
      gapMid = midGapVal;
      gapLeft = gapRight = (wall - totalArtWidth - (midGapVal * (artworks.length - 1))) / 2;
    } else if (mode === "fixLeft") {
      gapLeft = edgeVal;
      gapMid = gapRight = (wall - totalArtWidth - edgeVal) / artworks.length;
    } else if (mode === "fixRight") {
      gapRight = edgeVal;
      gapLeft = gapMid = (wall - totalArtWidth - edgeVal) / artworks.length;
    }

    // 壁幅にあわせてスライダーの範囲を動的に調整
    // 壁幅の1/4程度を上限にする（極端な移動を防ぐため）
    const limit = (wall / 4).toFixed(0);
    slideOffsetSlider.min = -limit;
    slideOffsetSlider.max = limit;

    // スライド微調整の適用
    gapLeft += slideOffset;
    gapRight -= slideOffset;

    if (gapLeft < 0 || gapMid < 0 || gapRight < 0) {
      errorDiv.innerText = "スライド量が限界を超えています";
      // 超えた場合は描画をリセット
      draw(wall, artworks, 0, 0, 0); 
      return;
    }

    gapDiv.innerHTML = `<span style="font-size:14px; color:#666;">左：${gapLeft.toFixed(1)} / 中：${gapMid.toFixed(1)} / 右：${gapRight.toFixed(1)}</span>`;

    draw(wall, artworks, gapLeft, gapMid, gapRight);
  }

  function draw(wall, artworks, gapLeft, gapMid, gapRight) {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scale = canvas.width / wall;
    let x = gapLeft * scale;

    artworks.forEach((w, i) => {
      const width = w * scale;
      ctx.fillStyle = "#333";
      ctx.fillRect(x, 40, width, 40);
      ctx.fillStyle = "white";
      ctx.font = "10px sans-serif";
      ctx.fillText(String.fromCharCode(65 + i), x + 4, 65);
      ctx.fillStyle = "black";
      ctx.fillText(`${w}`, x, 35);
      
      ctx.fillStyle = "blue";
      const dGap = (i === 0) ? gapLeft : gapMid;
      ctx.fillText(`${dGap.toFixed(0)}`, x - (dGap * scale) / 2 - 8, 105);

      x += width + (gapMid * scale);
    });

    ctx.fillStyle = "blue";
    ctx.fillText(`${gapRight.toFixed(0)}`, canvas.width - (gapRight * scale) / 2 - 8, 105);
  }

  // --- 連動処理（追加） ---
  // スライダーを動かしたら数値入力とプレビューに反映
  slideOffsetSlider.addEventListener("input", () => {
    slideOffsetText.value = slideOffsetSlider.value;
    calculate();
  });
  // 数値を入力したらスライダーとプレビューに反映
  slideOffsetText.addEventListener("input", () => {
    slideOffsetSlider.value = slideOffsetText.value;
    calculate();
  });

  // イベント登録
  calcMode.addEventListener("change", updateUI);
  [document.getElementById("wallWidth"), document.getElementById("edgeWidth"), document.getElementById("midGapWidth")].forEach(el => {
    el.addEventListener("input", calculate);
  });
  
  // 初期化
  addArtwork();
  addArtwork();
});