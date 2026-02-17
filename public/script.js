const RENDER_URL = "https://shadow-challenge.onrender.com"; // tuo server live

const video = document.getElementById("video");
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const timerEl = document.getElementById("timer");
const startBtn = document.getElementById("startBtn");
const shareBtn = document.getElementById("shareBtn");
const filterBtn = document.getElementById("filterBtn");
const filterSelect = document.querySelector(".filter-select");
const filterButtons = document.querySelectorAll(".filter");
const boostBtns = document.querySelectorAll(".boost");

const tapSound = new Audio("tap.mp3");
const gameOverSound = new Audio("gameover.mp3");
const boostSound = new Audio("boost.mp3");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let score = 0,
    timeLeft = 20,
    objects = [],
    isPlaying = false;
let spawnInterval, gameInterval;
let slowMotionActive = false,
    magnetActive = false;
let pendingBoosts = { slow: false, magnet: false };
let particleArray = [];

navigator.mediaDevices.getUserMedia({ video: true }).then(stream => video.srcObject = stream);

let pointer = { x: canvas.width / 2, y: canvas.height / 2 };
canvas.addEventListener("mousemove", e => pointer = { x: e.clientX, y: e.clientY });
canvas.addEventListener("touchmove", e => { pointer = { x: e.touches[0].clientX, y: e.touches[0].clientY }; e.preventDefault(); }, { passive: false });

const emojiList = ["🦄","🐉","🧚‍♀️","🌟","🔥","🪄","🍄","🌈"];
const gameOverEmoji = "💀";

// ---------------- PARTICLE ----------------
class Particle {
  constructor(x, y, color) {
    this.x = x; this.y = y; this.radius = Math.random() * 5 + 2;
    this.vx = (Math.random()-0.5)*4; this.vy = (Math.random()-0.5)*4;
    this.alpha = 1; this.color = color;
  }
  update() { this.x+=this.vx; this.y+=this.vy; this.alpha-=0.02; }
  draw() { ctx.save(); ctx.globalAlpha=this.alpha; ctx.fillStyle=this.color; ctx.beginPath(); ctx.arc(this.x,this.y,this.radius,0,Math.PI*2); ctx.fill(); ctx.restore(); }
}

// ---------------- GAME OBJECT ----------------
class GameObject {
  constructor(x, y, isGameOver){
    this.x=x; this.y=y; this.radius=35;
    this.isGameOver=isGameOver;
    this.emoji=isGameOver ? gameOverEmoji : emojiList[Math.floor(Math.random()*emojiList.length)];
    this.angle=Math.random()*Math.PI*2;
    this.glowColor=isGameOver?"rgba(150,0,0,0.5)":"cyan";
    this.vx=(Math.random()-0.5)*1.5;
    this.vy=(Math.random()-0.5)*1.5;
  }
  move(){
    if(!isPlaying) return;
    let speedFactor = slowMotionActive ? 0.4 : 1;
    this.x += this.vx * speedFactor;
    this.y += this.vy * speedFactor;

    if(magnetActive && !this.isGameOver){
      const dx = pointer.x - this.x, dy = pointer.y - this.y;
      this.x += dx*0.05; this.y += dy*0.05;
    }

    if(this.x<0 || this.x>canvas.width) this.vx*=-1;
    if(this.y<0 || this.y>canvas.height) this.vy*=-1;
    this.angle += 0.05;
  }
  draw(){
    ctx.save();
    ctx.font=`${this.radius*2}px Arial`;
    ctx.textAlign="center"; ctx.textBaseline="middle";
    ctx.shadowColor=this.glowColor; ctx.shadowBlur=this.isGameOver?5:15;
    let yOffset=Math.sin(this.angle)*10;
    ctx.fillText(this.emoji,this.x,this.y+yOffset);
    ctx.restore();
  }
}

// ---------------- SPAWN OBJECT ----------------
function spawnObject(){
  const isGameOver = Math.random()<0.15;
  objects.push(new GameObject(Math.random()*canvas.width, Math.random()*canvas.height, isGameOver));
}

// ---------------- PARTICLE EFFECT ----------------
function createParticles(x,y,color){
  for(let i=0;i<20;i++) particleArray.push(new Particle(x,y,color));
}

// ---------------- DRAW LOOP ----------------
function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  objects.forEach(o=>{ o.move(); o.draw(); });
  for(let i=particleArray.length-1;i>=0;i--){
    particleArray[i].update(); particleArray[i].draw();
    if(particleArray[i].alpha<=0) particleArray.splice(i,1);
  }
  requestAnimationFrame(draw);
}

// ---------------- HANDLE CLICK ----------------
function handleClick(mx,my){
  if(!isPlaying) return;
  for(let i=objects.length-1;i>=0;i--){
    const o=objects[i];
    const dx=mx-o.x, dy=my-o.y;
    if(Math.sqrt(dx*dx+dy*dy)<o.radius){
      if(o.isGameOver) return endGame();
      score++; scoreEl.textContent=score;
      tapSound.play();
      createParticles(o.x,o.y,"cyan");
      objects.splice(i,1);
    }
  }
}

canvas.addEventListener("click", e => handleClick(e.clientX,e.clientY));
canvas.addEventListener("touchstart", e => { handleClick(e.touches[0].clientX,e.touches[0].clientY); e.preventDefault(); }, { passive: false });

// ---------------- GAME ----------------
function startGame(){
  score=0; timeLeft=20; objects=[]; isPlaying=true;
  scoreEl.textContent=score; timerEl.textContent=timeLeft;

  if(pendingBoosts.slow){ slowMotionActive=true; setTimeout(()=>slowMotionActive=false,5000); pendingBoosts.slow=false; }
  if(pendingBoosts.magnet){ magnetActive=true; setTimeout(()=>magnetActive=false,3000); pendingBoosts.magnet=false; }

  spawnInterval=setInterval(spawnObject,700);
  gameInterval=setInterval(()=>{ timeLeft--; timerEl.textContent=timeLeft; if(timeLeft<=0) endGame(); },1000);
}

function endGame(){
  isPlaying=false; clearInterval(spawnInterval); clearInterval(gameInterval);
  objects.forEach(o=>{ o.vx=0; o.vy=0; });
  gameOverSound.play();
  alert("Game Over! Punteggio: "+score);
}

// ---------------- SHARE LINK ----------------
shareBtn.addEventListener("click", ()=>{
  const link = `${RENDER_URL}/shadow?score=${score}`;
  navigator.clipboard.writeText(link);
  alert("Link copiato! Condividilo con amici: "+link);
});

// ---------------- FILTERS ----------------
filterBtn.addEventListener("click", ()=>filterSelect.classList.toggle("hidden"));
filterButtons.forEach(btn=>{
  btn.addEventListener("click",()=>{
    const f=btn.dataset.filter;
    video.className=`filter${f}`;
    filterSelect.classList.add("hidden");
  });
});

// ---------------- BOOST BUTTONS ----------------
boostBtns.forEach(btn=>{
  btn.addEventListener("click", async ()=>{
    const type = btn.dataset.type;
    try {
      const res = await fetch(`${RENDER_URL}/create-checkout`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ type })
      });
      const data = await res.json();
      if(data.url) window.location.href = data.url;
    } catch(err){ console.error("Errore boost:", err); }
  });
});

// ---------------- RETURN FROM STRIPE ----------------
const params = new URLSearchParams(window.location.search);
const sessionId = params.get("session_id");

if(sessionId){
  fetch(`${RENDER_URL}/verify-payment`, {
    method:"POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify({ session_id: sessionId })
  })
  .then(res=>res.json())
  .then(data=>{
    if(data.success && data.type){
      boostSound.play();
      if(isPlaying){
        if(data.type==="slow"){ slowMotionActive=true; setTimeout(()=>slowMotionActive=false,5000); }
        if(data.type==="magnet"){ magnetActive=true; setTimeout(()=>magnetActive=false,3000); }
      } else {
        pendingBoosts[data.type]=true;
        alert(`${data.type} boost pronto per la prossima partita!`);
      }
    } else alert("Pagamento non completato.");
    window.history.replaceState({}, document.title, "/");
  })
  .catch(err=>console.error(err));
}

startBtn.addEventListener("click", startGame);
draw();
