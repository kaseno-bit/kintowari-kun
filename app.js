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
    let gaps = new Array(gapCount).fill(0);

    let fixedByGroupSum = 0;
    let groupGapIndices = [];
    for (let i = 0; i < artworks.length - 1; i++) {
      if (groupFlags[i] && groupFlags[i+1]) {
        const gapIdx = i + 1;
        gaps[gapIdx] = groupGapVal;
        fixedByGroupSum += groupGapVal;
        groupGapIndices.push(gapIdx);
      }
    }

    const flexibleGapIndices = [];
    for(let i=0; i<gapCount; i++) {
        if (!groupGapIndices.includes(i)) flexibleGapIndices.push(i);
    }

    if (mode === "even") {
      const g = (wall - totalArtWidth - fixedByGroupSum) / flexibleGapIndices.length;
      flexibleGapIndices.forEach(idx => gaps[idx] = g);
    } else if (mode === "fixEdge") {
      gaps[0] = gaps[gapCount - 1] = edgeVal;
      const flexMidIndices = flexibleGapIndices.filter(idx => idx !== 0 && idx !== gapCount - 1);
      const midG = flexMidIndices.length > 0 ? (wall - totalArtWidth - fixedByGroupSum - (edgeVal * 2)) / flexMidIndices.length : 0;
      flexMidIndices.forEach(idx => gaps[idx] = midG);
    } else if (mode === "fixGap") {
      const flexMidIndices = flexibleGapIndices.filter(idx => idx !== 0 && idx !== gapCount - 1);
      flexMidIndices.forEach(idx => gaps[idx] = midGapVal);
      const sideG = (wall - totalArtWidth - fixedByGroupSum - (midGapVal * flexMidIndices.length)) / 2;
      gaps[0] = gaps[gapCount - 1] = sideG;
    } else if (mode === "fixLeft") {
      gaps[0] = edgeVal;
      const otherFlex = flexibleGapIndices.filter(idx => idx !== 0);
      const g = otherFlex.length > 0 ? (wall - totalArtWidth - fixedByGroupSum - edgeVal) / otherFlex.length : 0;
      otherFlex.forEach(idx => gaps[idx] = g);
    } else if (mode === "fixRight") {
      gaps[gapCount - 1] = edgeVal;
      const otherFlex = flexibleGapIndices.filter(idx => idx !== gapCount - 1);
      const g = otherFlex.length > 0 ? (wall - totalArtWidth - fixedByGroupSum - edgeVal) / otherFlex.length : 0;
      otherFlex.forEach(idx => gaps[idx] = g);
    }

    let lockedSum = 0;
    let currentLockedIndices = [];
    Object.keys(lockedGaps).forEach(idx => {
      const i = parseInt(idx);
      if (i < gapCount && !groupGapIndices.includes(i)) {
        gaps[i] = lockedGaps[idx];
        lockedSum += gaps[i];
        currentLockedIndices.push(i);
      }
    });

    const finalFlexIndices = flexibleGapIndices.filter(idx => !currentLockedIndices.includes(idx));
    if (finalFlexIndices.length > 0) {
        let flexWall = wall - totalArtWidth - fixedByGroupSum - lockedSum;
        if(mode === "fixEdge") {
            if(!currentLockedIndices.includes(0)) flexWall -= edgeVal;
            if(!currentLockedIndices.includes(gapCount-1)) flexWall -= edgeVal;
        } else if(mode === "fixGap") {
            const flexMid = flexibleGapIndices.filter(idx => idx !== 0 && idx !== gapCount - 1 && !currentLockedIndices.includes(idx));
            flexWall -= (flexMid.length * midGapVal);
        } else if(mode === "fixLeft" && !currentLockedIndices.includes(0)) {
            flexWall -= edgeVal;
        } else if(mode === "fixRight" && !currentLockedIndices.includes(gapCount-1)) {
            flexWall -= edgeVal;
        }
        const finalG = flexWall / finalFlexIndices.length;
        finalFlexIndices.forEach(idx => gaps[idx] = finalG);
    }

    gaps[0] += slideOffset;
    gaps[gapCount - 1] -= slideOffset;

    if (gaps.some(g => g < 0)) { errorDiv.innerText = "数値が限界を超えています"; return; }
    gapDiv.innerHTML = `<span style="font-size:14px; color:#666;">計算完了</span>`;
    renderIndividualGaps(gaps, groupGapIndices);
    draw(wall, artworks, gaps, groupFlags);
  }

  function renderIndividualGaps(gaps, groupGapIndices) {
    individualGapsDiv.innerHTML = "";
    gaps.forEach((g, i) => {
      const row = document.createElement("div");
      row.className = "gap-row";
      if (groupGapIndices.includes(i)) row.style.opacity = "0.5";
      const label = (i === 0) ? "左端" : (i === gaps.length - 1) ? "右端" : `隙間${i}`;
      row.innerHTML = `<span>${label}:</span>`;
      const input = document.createElement("input");
      input.type = "number";
      input.value = g.toFixed(1);
      input.disabled = groupGapIndices.includes(i);
      if (lockedGaps[i] !== undefined) input.classList.add("locked");
      input.onchange = (e) => { lockedGaps[i] = parseFloat(e.target.value); calculate(); };
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

  slideOffsetSlider.addEventListener("input", () => { slideOffsetText.value = slideOffsetSlider.value; calculate(); });
  slideOffsetText.addEventListener("input", () => { slideOffsetSlider.value = slideOffsetText.value; calculate(); });
  calcMode.addEventListener("change", updateUI);
  [document.getElementById("wallWidth"), document.getElementById("edgeWidth"), document.getElementById("midGapWidth"), groupGapInput].forEach(el => el.addEventListener("input", calculate));
  addArtwork(); addArtwork();
});