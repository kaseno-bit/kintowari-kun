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

  // --- アプリ切り替え ---
  window.switchApp = function(app) {
    const kintoEl = document.getElementById('app-kinto');
    const bisEl = document.getElementById('app-bis');
    const btnKinto = document.getElementById('btn-kinto');
    const btnBis = document.getElementById('btn-bis');

    if (app === 'kinto') {
      kintoEl.style.display = 'block';
      bisEl.style.display = 'none';
      btnKinto.classList.add('active');
      btnBis.classList.remove('active');
      calculateKinto();
    } else {
      kintoEl.style.display = 'none';
      bisEl.style.display = 'block';
      btnKinto.classList.remove('active');
      btnBis.classList.add('active');
      calcBis();
    }
  };

  // --- 均等割りロジック ---
  window.addArtwork = function(value = "") {
    const wrapper = document.createElement("div");
    wrapper.className = "art-input-row";
    
    // 1. 作品幅入力
    const input = document.createElement("input");
    input.type = "number";
    input.placeholder = "幅";
    input.value = value;
    input.inputMode = "decimal";
    input.className = "art-width-input";
    input.oninput = calculateKinto;

    // 2. 「連」チェックボックス
    const groupLabel = document.createElement("label");
    groupLabel.className = "group-check-label";
    const groupCheck = document.createElement("input");
    groupCheck.type = "checkbox";
    groupCheck.className = "group-check";
    groupCheck.onchange = calculateKinto;
    
    const span = document.createElement("span");
    span.innerText = "連";
    groupLabel.appendChild(groupCheck);
    groupLabel.appendChild(span);

    // 3. 削除ボタン
    const del = document.createElement("button");
    del.className = "btn-delete";
    del.innerHTML = '<span class="material-icons-round" style="font-size:20px">delete</span>';
    del.type = "button";
    del.onclick = () => { wrapper.remove(); lockedGaps = {}; calculateKinto(); };

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
    calculateKinto();
  }

  function calculateKinto() {
    const wall = parseFloat(document.getElementById("wallWidth").value);
    if (!wall) return;
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
      if (!isNaN(val)) { artworks.push(val); groupFlags.push(row.querySelector(".group-check").checked); }
    });

    if (artworks.length === 0) return;
    const totalArtWidth = artworks.reduce((a, b) => a + b, 0);
    const gapCount = artworks.length + 1;
    let gapsState = new Array(gapCount).fill(null).map(() => ({ value: 0, isFixed: false }));

    if (mode === "fixEdge") { gapsState[0] = gapsState[gapCount-1] = { value: edgeVal, isFixed: true }; }
    else if (mode === "fixLeft") { gapsState[0] = { value: edgeVal, isFixed: true }; }
    else if (mode === "fixRight") { gapsState[gapCount-1] = { value: edgeVal, isFixed: true }; }
    else if (mode === "fixGap") { for (let i = 1; i < gapCount - 1; i++) gapsState[i] = { value: midGapVal, isFixed: true }; }

    for (let i = 0; i < artworks.length - 1; i++) {
      if (groupFlags[i] && groupFlags[i+1]) gapsState[i+1] = { value: groupGapVal, isFixed: true };
    }

    Object.keys(lockedGaps).forEach(idx => {
      const i = parseInt(idx);
      if (i < gapCount) gapsState[i] = { value: lockedGaps[idx], isFixed: true };
    });

    const fixedSum = gapsState.reduce((sum, g) => sum + (g.isFixed ? g.value : 0), 0);
    const freeIndices = gapsState.map((g, i) => g.isFixed ? null : i).filter(v => v !== null);

    if (freeIndices.length > 0) {
      const freeVal = (wall - totalArtWidth - fixedSum) / freeIndices.length;
      freeIndices.forEach(idx => gapsState[idx].value = freeVal);
    }

    let finalGaps = gapsState.map(g => g.value);
    finalGaps[0] += slideOffset;
    finalGaps[gapCount - 1] -= slideOffset;

    renderIndividualGaps(finalGaps, gapsState.map(g => g.isFixed));
    drawKinto(wall, artworks, finalGaps, groupFlags);
  }

  function renderIndividualGaps(gaps, isFixedArray) {
    individualGapsDiv.innerHTML = "";
    gaps.forEach((g, i) => {
      const row = document.createElement("div");
      row.className = "gap-row";
      const label = (i === 0) ? "左端" : (i === gaps.length - 1) ? "右端" : `隙間${i}`;
      row.innerHTML = `<span>${label}:</span>`;
      const input = document.createElement("input");
      input.type = "number";
      input.value = g.toFixed(1);
      if (lockedGaps[i] !== undefined) input.classList.add("locked");
      input.onchange = (e) => { lockedGaps[i] = parseFloat(e.target.value); calculateKinto(); };
      row.appendChild(input);
      individualGapsDiv.appendChild(row);
    });
  }

  function drawKinto(wall, artworks, gaps, groupFlags) {
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
        ctx.fillStyle = inGroup ? "#2563eb" : "#1e293b";
        ctx.fillRect(x, 40, w, 40);
        ctx.fillStyle = "white";
        ctx.font = "bold 10px Inter, sans-serif";
        ctx.fillText(String.fromCharCode(65 + i), x + 4, 65);
        ctx.fillStyle = "#64748b";
        ctx.fillText(`${artworks[i]}`, x, 35);
        ctx.fillStyle = "#2563eb";
        ctx.fillText(`${gap.toFixed(0)}`, x - (gap * scale) / 2 - 8, 105);
        x += w;
      } else {
        ctx.fillStyle = "#2563eb";
        ctx.fillText(`${gap.toFixed(0)}`, canvas.width - (gap * scale) / 2 - 8, 105);
      }
    });
  }

  // --- ビス位置くんロジック ---
  window.calcBis = function() {
    const center = parseFloat(document.getElementById("centerLine").value) || 0;
    const h = parseFloat(document.getElementById("artHeight").value) || 0;
    const fromTop = parseFloat(document.getElementById("bisFromTop").value) || 0;
    const w = parseFloat(document.getElementById("artWidth").value) || 0;
    const preset = document.getElementById("bisPreset").value;

    let resA = "-", resB = "-", resC = "-", resD = "-", resE = "-", resF = "-";
    if (h > 0) {
      resA = (center - h / 2).toFixed(0);
      resB = (center + h / 2).toFixed(0);
      if (fromTop > 0) {
        const bisH = parseFloat(resB) - fromTop;
        resD = bisH.toFixed(0);
        resC = (bisH - center).toFixed(0);
      }
    }
    if (w > 0) {
      let e, f;
      if (preset === "1:3:1") { e = w * (1/5); f = w * (3/5); }
      else if (preset === "2:3:2") { e = w * (2/7); f = w * (3/7); }
      else { e = w / 2; f = 0; }
      resE = e.toFixed(0); resF = f.toFixed(0);
    }
    document.getElementById("res-A").innerText = resA;
    document.getElementById("res-B").innerText = resB;
    document.getElementById("res-C").innerText = resC;
    document.getElementById("res-D").innerText = resD;
    document.getElementById("res-E").innerText = resE;
    document.getElementById("res-F").innerText = resF;

    drawBis(center, h, w > 0 ? w : h, parseFloat(resC) || 0, parseFloat(resE) || 0, parseFloat(resF) || 0, preset, w > 0);
  };

  function drawBis(center, h, w, bisC, bisE, bisF, preset, isActualWidth) {
    const canvas = document.getElementById("canvas-bis");
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (h <= 0) return;

    const padTop = 60, padSide = 75, padBottom = 50;
    const totalMaxH = Math.max(center + h/2 + 100, 2000);
    const scale = Math.min((canvas.height - padTop - padBottom) / totalMaxH, (canvas.width - padSide * 2) / w, 0.4);

    const cx = canvas.width / 2;
    const groundY = canvas.height - padBottom;
    const centerY = groundY - (center * scale);
    const ty = centerY - (h / 2 * scale);
    const by = centerY + (h / 2 * scale);
    const rw = w * scale, rh = h * scale;

    ctx.strokeStyle = "#cbd5e1"; ctx.beginPath(); ctx.moveTo(10, groundY); ctx.lineTo(canvas.width - 10, groundY); ctx.stroke();
    ctx.fillStyle = "#94a3b8"; ctx.fillText("床", 5, groundY + 12);
    ctx.setLineDash([2, 2]); ctx.strokeStyle = "rgba(220, 38, 38, 0.3)"; ctx.beginPath(); ctx.moveTo(10, centerY); ctx.lineTo(canvas.width-10, centerY); ctx.stroke();
    ctx.setLineDash([]); ctx.fillStyle = "#dc2626"; ctx.font = "bold 11px sans-serif"; ctx.fillText(`CL: ${center}`, 10, centerY - 7);

    ctx.strokeStyle = isActualWidth ? "#1e293b" : "#cbd5e1"; ctx.lineWidth = 2; ctx.strokeRect(cx - rw/2, ty, rw, rh);
    const bisY = centerY - (bisC * scale);

    drawHelper(ctx, cx + rw/2 + 15, groundY, cx + rw/2 + 15, by, "#64748b", `A:${(center - h/2).toFixed(0)}`);
    drawHelper(ctx, cx + rw/2 + 48, groundY, cx + rw/2 + 48, ty, "#64748b", `B:${(center + h/2).toFixed(0)}`);
    drawHelper(ctx, 40, groundY, 40, bisY, "#dc2626", `D:${(center + bisC).toFixed(0)}`);
    if (Math.abs(bisC) > 2) drawHelper(ctx, cx - rw/2 - 15, centerY, cx - rw/2 - 15, bisY, "#dc2626", `C:${bisC > 0 ? '+' : ''}${bisC}`);

    ctx.fillStyle = "#1e293b";
    if (isActualWidth && preset !== "1:1") {
      const blx = cx - rw/2 + (bisE * scale), brx = cx + rw/2 - (bisE * scale);
      ctx.beginPath(); ctx.arc(blx, bisY, 4, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(brx, bisY, 4, 0, Math.PI*2); ctx.fill();
      drawHelper(ctx, blx, bisY, brx, bisY, "#2563eb", `F:${bisF}`);
      drawHelper(ctx, cx - rw/2, ty + 15, blx, ty + 15, "#2563eb", `E:${bisE}`);
    } else { ctx.beginPath(); ctx.arc(cx, bisY, 4, 0, Math.PI*2); ctx.fill(); }
  }

  function drawHelper(ctx, x1, y1, x2, y2, color, label) {
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.beginPath(); ctx.arc(x1, y1, 2, 0, Math.PI*2); ctx.fill(); ctx.beginPath(); ctx.arc(x2, y2, 2, 0, Math.PI*2); ctx.fill();
    const tw = ctx.measureText(label).width;
    ctx.fillStyle = "white"; ctx.fillRect((x1+x2)/2 - tw/2 - 2, (y1+y2)/2 - 7, tw + 4, 14);
    ctx.fillStyle = color; ctx.fillText(label, (x1+x2)/2 - tw/2, (y1+y2)/2 + 4);
  }

  // 初期化・イベント
  calcMode.addEventListener("change", updateUI);
  [slideOffsetSlider, slideOffsetText].forEach(el => el.addEventListener("input", (e) => {
    slideOffsetText.value = slideOffsetSlider.value = e.target.value; calculateKinto();
  }));
  ["wallWidth", "edgeWidth", "midGapWidth", "groupGapWidth", "centerLine"].forEach(id => {
    document.getElementById(id).addEventListener("input", () => { if(id === "centerLine") calcBis(); else calculateKinto(); });
  });
  
  addArtwork(); addArtwork();
});