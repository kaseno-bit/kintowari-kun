document.addEventListener("DOMContentLoaded", () => {
  const artworksDiv = document.getElementById("artworks");
  const calcMode = document.getElementById("calcMode");
  const extraSettings = document.getElementById("extraSettings");
  const edgeInputGroup = document.getElementById("edgeInputGroup");
  const gapInputGroup = document.getElementById("gapInputGroup");
  const edgeLabel = document.getElementById("edgeLabel");
  const slideOffsetSlider = document.getElementById("slideOffset");
  const slideOffsetText = document.getElementById("slideOffsetText");
  const individualGapsDiv = document.getElementById("individualGaps");
  const groupGapInput = document.getElementById("groupGapWidth");

  let lockedGaps = {};

  window.addArtwork = function(value = "") {
    const wrapper = document.createElement("div");
    wrapper.className = "art-input-row";

    const input = document.createElement("input");
    input.type = "number";
    input.placeholder = "幅";
    input.value = value;
    input.inputMode = "decimal";
    input.className = "art-width-input";
    input.oninput = () => { calculate(); };

    const groupLabel = document.createElement("label");
    groupLabel.className = "group-check-label";
    const groupCheck = document.createElement("input");
    groupCheck.type = "checkbox";
    groupCheck.className = "group-check";
    groupCheck.onchange = calculate;
    groupLabel.appendChild(groupCheck);
    groupLabel.append("連");

    const del = document.createElement("button");
    del.innerText = "×";
    del.type = "button";
    del.onclick = () => { wrapper.remove(); lockedGaps = {}; calculate(); };

    wrapper.appendChild(input);
    wrapper.appendChild(groupLabel);
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
    lockedGaps = {}; 
    calculate();
  }

  function calculate() {
    const wall = parseFloat(document.getElementById("wallWidth").value);
    const mode = calcMode.value;
    const edgeVal = parseFloat(document.getElementById("edgeWidth").value) || 0;
    const midGapVal = parseFloat(document.getElementById("midGapWidth").value) || 0;
    const groupGapVal = parseFloat(groupGapInput.value) || 0;
    const slideOffset = parseFloat(slideOffsetText.value) || 0;

    const rows = artworksDiv.querySelectorAll(".art-input-row");
    const artworks = [];
    const groupFlags = []; 

    rows.forEach(row => {
      const val = parseFloat(row.querySelector(".art-width-input").value);
      if (!isNaN(val)) {
        artworks.push(val);
        groupFlags.push(row.querySelector(".group-check").checked);
      }
    });

    const errorDiv = document.getElementById("error");
    const gapDiv = document.getElementById("gap");
    errorDiv.innerText = "";
    gapDiv.innerText = "";

    if (!wall || artworks.length === 0) return;

    const totalArtWidth = artworks.reduce((a, b) => a + b, 0);
    const gapCount = artworks.length + 1;
    
    // 全隙間の状態を管理する配列
    // { value: 数値, isFixed: 固定されているか }
    let gapsState = new Array(gapCount).fill(null).map(() => ({ value: 0, isFixed: false }));

    // 1. モードによる固定設定
    if (mode === "fixEdge") {
      gapsState[0] = { value: edgeVal, isFixed: true };
      gapsState[gapCount - 1] = { value: edgeVal, isFixed: true };
    } else if (mode === "fixLeft") {
      gapsState[0] = { value: edgeVal, isFixed: true };
    } else if (mode === "fixRight") {
      gapsState[gapCount - 1] = { value: edgeVal, isFixed: true };
    } else if (mode === "fixGap") {
      for (let i = 1; i < gapCount - 1; i++) {
        gapsState[i] = { value: midGapVal, isFixed: true };
      }
    }

    // 2. グループ設定による固定（最優先）
    for (let i = 0; i < artworks.length - 1; i++) {
      if (groupFlags[i] && groupFlags[i+1]) {
        gapsState[i+1] = { value: groupGapVal, isFixed: true };
      }
    }

    // 3. 個別ロックによる固定
    Object.keys(lockedGaps).forEach(idx => {
      const i = parseInt(idx);
      if (i < gapCount) {
        gapsState[i] = { value: lockedGaps[idx], isFixed: true };
      }
    });

    // 4. 残りの自由な隙間を計算
    const fixedSum = gapsState.reduce((sum, g) => sum + (g.isFixed ? g.value : 0), 0);
    const freeGapsIndices = gapsState.map((g, i) => g.isFixed ? null : i).filter(v => v !== null);

    if (freeGapsIndices.length > 0) {
      const freeGapVal = (wall - totalArtWidth - fixedSum) / freeGapsIndices.length;
      freeGapsIndices.forEach(idx => {
        gapsState[idx].value = freeGapVal;
      });
    }

    // 5. スライド微調整（最終的な値に加減算）
    let finalGaps = gapsState.map(g => g.value);
    finalGaps[0] += slideOffset;
    finalGaps[gapCount - 1] -= slideOffset;

    if (finalGaps.some(g => g < 0)) {
      errorDiv.innerText = "数値が限界を超えています";
      return;
    }

    gapDiv.innerHTML = `<span style="font-size:14px; color:#666;">計算完了</span>`;
    renderIndividualGaps(finalGaps, gapsState.map(g => g.isFixed));
    draw(wall, artworks, finalGaps, groupFlags);
  }

  function renderIndividualGaps(gaps, isFixedArray) {
    individualGapsDiv.innerHTML = "";
    gaps.forEach((g, i) => {
      const row = document.createElement("div");
      row.className = "gap-row";
      if (isFixedArray[i]) row.style.backgroundColor = "#fff0f0";
      
      const label = (i === 0) ? "左端" : (i === gaps.length - 1) ? "右端" : `隙間${i}`;
      row.innerHTML = `<span>${label}:</span>`;
      
      const input = document.createElement("input");
      input.type = "number";
      input.value = g.toFixed(1);
      if (lockedGaps[i] !== undefined) input.classList.add("locked");
      
      // グループ固定されている場合は入力を無効化（混乱防止）
      // ただし個別ロックは可能にしたいので判定に注意
      input.onchange = (e) => {
        lockedGaps[i] = parseFloat(e.target.value);
        calculate();
      };
      row.appendChild(input);
      individualGapsDiv.appendChild(row);
    });
  }

  function draw(wall, artworks, gaps, groupFlags) {
    const canvas = document.getElementById("canvas");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const scale = canvas.width / wall;
    let x = 0;

    gaps.forEach((gap, i) => {
      x += gap * scale;
      if (i < artworks.length) {
        const w = artworks[i] * scale;
        const inGroup = (groupFlags[i] && groupFlags[i+1]) || (groupFlags[i] && groupFlags[i-1]);
        ctx.fillStyle = inGroup ? "#007bff" : "#333";
        ctx.fillRect(x, 40, w, 40);
        
        ctx.fillStyle = "white";
        ctx.font = "10px sans-serif";
        ctx.fillText(String.fromCharCode(65 + i), x + 4, 65);
        
        ctx.fillStyle = "black";
        ctx.fillText(`${artworks[i]}`, x, 35);
        
        ctx.fillStyle = "blue";
        ctx.fillText(`${gap.toFixed(0)}`, x - (gap * scale) / 2 - 8, 105);
        x += w;
      } else {
        ctx.fillStyle = "blue";
        ctx.fillText(`${gap.toFixed(0)}`, canvas.width - (gap * scale) / 2 - 8, 105);
      }
    });
  }

  // イベント登録
  slideOffsetSlider.addEventListener("input", () => { slideOffsetText.value = slideOffsetSlider.value; calculate(); });
  slideOffsetText.addEventListener("input", () => { slideOffsetSlider.value = slideOffsetSlider.value; calculate(); });
  calcMode.addEventListener("change", updateUI);
  [document.getElementById("wallWidth"), document.getElementById("edgeWidth"), document.getElementById("midGapWidth"), groupGapInput].forEach(el => el.addEventListener("input", calculate));
  
  addArtwork(); addArtwork();
});