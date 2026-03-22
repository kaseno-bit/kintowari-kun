const artworksDiv = document.getElementById("artworks");

function addArtwork(value = "") {
  const input = document.createElement("input");
  input.type = "number";
  input.placeholder = "作品幅";
  input.value = value;
  input.oninput = calculate;
  artworksDiv.appendChild(input);
}

// 初期2つ
addArtwork();
addArtwork();

document.getElementById("wallWidth").addEventListener("input", calculate);

function calculate() {
  const wall = parseFloat(document.getElementById("wallWidth").value);

  const inputs = artworksDiv.querySelectorAll("input");
  const artworks = [];

  inputs.forEach(i => {
    const val = parseFloat(i.value);
    if (!isNaN(val)) artworks.push(val);
  });

  const errorDiv = document.getElementById("error");
  const gapDiv = document.getElementById("gap");

  errorDiv.innerText = "";
  gapDiv.innerText = "";

  if (!wall || artworks.length === 0) return;

  const total = artworks.reduce((a, b) => a + b, 0);

  if (total > wall) {
    errorDiv.innerText = "作品幅が壁を超えています";
    return;
  }

  const gap = (wall - total) / (artworks.length + 1);

  gapDiv.innerText = `余白：${gap.toFixed(1)} mm`;

  draw(wall, artworks, gap);
}

function draw(wall, artworks, gap) {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const scale = canvas.width / wall;

  let x = gap * scale;

  artworks.forEach((w, i) => {
    const width = w * scale;

    ctx.fillStyle = "#333";
    ctx.fillRect(x, 40, width, 40);

    ctx.fillStyle = "white";
    ctx.fillText(String.fromCharCode(65 + i), x + 5, 65);

    x += width + gap * scale;
  });
}