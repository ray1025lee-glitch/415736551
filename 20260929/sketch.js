// 定義指定的圓圈顏色陣列
let circleColors = [
  "#8ecae6",
  "#219ebc",
  "#023047",
  "#ffb703",
  "#fb8500"
];

// 定義指定的框線顏色陣列
let strokeColors = [
  "#132a13",
  "#31572c",
  "#4f772d",
  "#90a955",
  "#ecf39e"
];

let balloons = [];
let particles = [];     // 儲存爆炸碎塊
let gameStarted = false; // 控制是否已經點擊開始

// Web Audio API 與 UI 介面控制變數
let audioCtx = null;
let popAudioBuffer = null;
let masterGainNode = null; // 總音量控制節點
let volumeSlider;          // 音量滑桿
let muteButton;            // 靜音切換按鈕
let isMuted = false;       // 目前是否靜音

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  // 1. 初始化 Web Audio API 與背景非同步載入音效
  initAudio();

  // 2. 建立網頁介面控制元件（音量滑桿與靜音按鈕）
  createAudioControls();
}

function draw() {
  background(240);

  // 如果還沒點擊開始，顯示啟動提示畫面
  if (!gameStarted) {
    drawStartScreen();
    // 尚未開始時，把控制元件隱藏
    if (volumeSlider) volumeSlider.hide();
    if (muteButton) muteButton.hide();
    return; 
  } else {
    // 開始後，顯示控制元件
    if (volumeSlider) volumeSlider.show();
    if (muteButton) muteButton.show();
  }

  // 1. 更新與繪製氣球
  for (let i = balloons.length - 1; i >= 0; i--) {
    let b = balloons[i];
    b.update();
    b.display();

    // 如果氣球壽命到了，觸發爆破並重新從下方生成
    if (b.isDead() || b.y + b.diameter / 2 < 0) {
      b.explode(); 
      balloons.splice(i, 1); 
      balloons.push(new Balloon(false)); 
    }
  }

  // 2. 更新與繪製爆炸碎塊
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.update();
    p.display();
    if (p.isFinished()) {
      particles.splice(i, 1); 
    }
  }
}

// 初始化 Web Audio 並非同步下載音效
function initAudio() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();

    // 建立 Master Gain 節點來統一控制音量
    masterGainNode = audioCtx.createGain();
    masterGainNode.gain.value = 0.5; // 預設音量 50%
    masterGainNode.connect(audioCtx.destination);

    // 使用 fetch 在背景讀取音效檔
    fetch('balloon-pop-36589.mp3')
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => audioCtx.decodeAudioData(arrayBuffer))
      .then(decodedBuffer => {
        popAudioBuffer = decodedBuffer;
        console.log("Web Audio 氣球音效載入成功！");
      })
      .catch(e => {
        console.log("找不到音效檔或格式不支援，將以無音效模式執行。", e);
      });
  } catch (e) {
    console.log("瀏覽器不支援 Web Audio API", e);
  }
}

// 建立 HTML 音量滑桿與靜音按鈕
function createAudioControls() {
  // 建立音量滑桿 (最小值 0, 最大值 1, 預設 0.5, 每次變動間距 0.01)
  volumeSlider = createSlider(0, 1, 0.5, 0.01);
  volumeSlider.position(20, 20);
  volumeSlider.style('width', '120px');
  volumeSlider.input(() => {
    if (!isMuted && masterGainNode) {
      masterGainNode.gain.value = volumeSlider.value();
    }
  });

  // 建立靜音/開啟音量按鈕
  muteButton = createButton('🔊 聲音：開');
  muteButton.position(150, 18);
  muteButton.style('padding', '4px 10px');
  muteButton.style('cursor', 'pointer');
  muteButton.mousePressed(() => {
    isMuted = !isMuted;
    if (isMuted) {
      muteButton.html('🔇 聲音：關');
      if (masterGainNode) masterGainNode.gain.value = 0; // 靜音
    } else {
      muteButton.html('🔊 聲音：開');
      if (masterGainNode) masterGainNode.gain.value = volumeSlider.value(); // 恢復滑桿數值
    }
  });

  // 初始先隱藏，直到點擊開始遊戲才顯示
  volumeSlider.hide();
  muteButton.hide();
}

// 播放爆破音效的函式
function playPopSound() {
  if (!audioCtx || !popAudioBuffer) return;

  // 確保 AudioContext 處於執行狀態
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  // 建立音源節點並連接到總音量控制 (masterGainNode)
  let source = audioCtx.createBufferSource();
  source.buffer = popAudioBuffer;
  source.connect(masterGainNode);
  source.start(0);
}

// 繪製開始提示畫面
function drawStartScreen() {
  push();
  textAlign(CENTER, CENTER);
  
  // 半透明遮罩背景
  fill(0, 0, 0, 40);
  rect(0, 0, width, height);

  // 提示文字框
  fill(255);
  stroke(2, 48, 71);
  strokeWeight(4);
  rectMode(CENTER);
  rect(width / 2, height / 2, 400, 150, 20);

  // 文字內容
  noStroke();
  fill(2, 48, 71);
  textSize(24);
  text("🎈 氣球動畫與爆破特效 🎈", width / 2, height / 2 - 30);
  
  textSize(16);
  fill(100);
  text("請點擊任意處以開始並啟用音效", width / 2, height / 2 + 20);
  pop();
}

// 滑鼠點擊時觸發開始並解鎖音訊
function mousePressed() {
  // 避免點擊到左上角的控制按鈕時觸發重新初始化或干擾
  if (mouseY < 60 && mouseX < 280 && gameStarted) return;

  if (!gameStarted) {
    gameStarted = true; // 進入遊戲狀態
    
    // 初始化建立多顆由下往上飄動的氣球
    let numCircles = 15;
    for (let i = 0; i < numCircles; i++) {
      balloons.push(new Balloon(true)); 
    }
  }

  // 確保點擊時喚醒 AudioContext
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

// 氣球類別
class Balloon {
  constructor(isInitial) {
    // 圓的直徑大小範圍 50-300 亂數產生
    this.diameter = random(50, 300);
    let radius = this.diameter / 2;
    
    // 生成位置與座標依亂數生成
    this.x = random(radius, width - radius);
    
    if (isInitial) {
      this.y = random(radius, height - radius);
    } else {
      this.y = height + radius; // 從畫面下方生成
    }
    
    // 由下往上飄動的速度設定
    this.vy = random(-2.0, -0.8);
    this.vx = random(-0.3, 0.3);

    // 顏色與框線隨機挑選指定五種
    this.colorHex = random(circleColors);
    this.strokeHex = random(strokeColors);
    
    // 圓的透明度採隨機變數 90-100 間
    this.alphaValue = random(90, 100);
    
    // 存在時間約 350-420 影格之間以隨機變數
    this.maxLife = random(350, 420);
    this.lifeTimer = 0;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.lifeTimer++;
  }

  isDead() {
    return this.lifeTimer >= this.maxLife;
  }

  display() {
    push();
    let fillColor = color(this.colorHex);
    fillColor.setAlpha(this.alphaValue);
    fill(fillColor);

    stroke(this.strokeHex);
    strokeWeight(3);

    // 繪製氣球本體
    ellipse(this.x, this.y, this.diameter, this.diameter);

    // 繪製氣球右上方內的星星符號（大小隨氣球大小改變）
    this.drawStar();
    pop();
  }

  drawStar() {
    let radius = this.diameter / 2;
    let offsetX = radius * 0.45;
    let offsetY = -radius * 0.45;
    let starX = this.x + offsetX;
    let starY = this.y + offsetY;
    
    let outerRadius = this.diameter * 0.08;
    let innerRadius = outerRadius * 0.4;

    fill(255, 220);
    stroke(this.strokeHex);
    strokeWeight(1.5);
    
    starShape(starX, starY, innerRadius, outerRadius, 5);
  }

  explode() {
    // 播放爆破音效
    playPopSound();

    // 產生碎塊效果
    let numParticles = int(random(15, 30));
    for (let i = 0; i < numParticles; i++) {
      particles.push(new Particle(this.x, this.y, this.colorHex, this.strokeHex));
    }
  }
}

// 爆炸碎塊類別
class Particle {
  constructor(x, y, colHex, strokeHex) {
    this.x = x;
    this.y = y;
    this.colorHex = colHex;
    this.strokeHex = strokeHex;
    
    let angle = random(TWO_PI);
    let speed = random(2, 7);
    this.vx = cos(angle) * speed;
    this.vy = sin(angle) * speed;
    
    this.size = random(6, 16);
    this.alpha = 255;
    this.decay = random(5, 10); // 漸隱速度
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.94; // 空氣阻力
    this.vy *= 0.94;
    this.alpha -= this.decay; // 漸漸消失
  }

  isFinished() {
    return this.alpha <= 0;
  }

  display() {
    push();
    let c = color(this.colorHex);
    c.setAlpha(this.alpha);
    fill(c);
    
    let sc = color(this.strokeHex);
    sc.setAlpha(this.alpha);
    stroke(sc);
    strokeWeight(1);

    ellipse(this.x, this.y, this.size, this.size);
    pop();
  }
}

// 輔助函式：繪製星星外框
function starShape(x, y, radius1, radius2, npoints) {
  let angle = TWO_PI / npoints;
  let halfAngle = angle / 2.0;
  beginShape();
  for (let a = 0; a < TWO_PI; a += angle) {
    let sx = x + cos(a) * radius2;
    let sy = y + sin(a) * radius2;
    vertex(sx, sy);
    sx = x + cos(a + halfAngle) * radius1;
    sy = y + sin(a + halfAngle) * radius1;
    vertex(sx, sy);
  }
  endShape(CLOSE);
}

// 當瀏覽器視窗大小改變時自動調整畫布大小
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
