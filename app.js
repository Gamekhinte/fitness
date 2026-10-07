const GEMINI_API_KEY = "DEIN_KEY_HIER";
const GEMINI_MODEL = "gemini-1.5-flash";
const $ = id => document.getElementById(id);
const store = { get:(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}}, set:(k,v)=>localStorage.setItem(k,JSON.stringify(v)) };

/* ---------- Tabs ---------- */
let map = null;
function showTab(t){
  document.querySelectorAll('.tab').forEach(s=>s.classList.toggle('active',s.id==='tab-'+t));
  document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.tab===t));
  if(t==='lung'){initMap();setTimeout(()=>map&&map.invalidateSize(),150)}
  if(t!=='cam'&&camOn) stopCam();
  window.scrollTo(0,0);
}
document.querySelectorAll('.nav button').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));

/* ---------- FOOD ---------- */
const FOOD = {
  "Ei & Frühstück":[["3 Rühreier",270,19],["Haferflocken mit Whey",420,32],["Omelett mit Gemüse",310,22],["Skyr mit Beeren",190,20]],
  "Fast Food (Cleaned)":[["Grilled-Chicken-Burger",480,38],["Döner-Teller ohne Soße",560,42],["Chicken Wrap Vollkorn",450,34],["Reisbowl mit Hähnchen",620,45]],
  "Salate & Bowls":[["Thunfisch-Salat",340,31],["Quinoa-Bowl mit Lachs",640,40],["Hähnchen-Caesar (light)",410,36],["Linsen-Bowl",480,24]],
  "Protein-Snacks":[["Proteinriegel",210,20],["Hüttenkäse 200 g",180,22],["Beef Jerky 50 g",130,20],["Mandeln 30 g",175,6]],
  "Getränke":[["Whey-Shake mit Milch",280,32],["Magermilch 500 ml",175,17],["Kaffee mit Milch",45,2],["Mass-Gainer-Shake",650,50]]
};
let eaten = store.get('eaten',{kcal:0,protein:0,day:new Date().toDateString()});
if(eaten.day!==new Date().toDateString()) eaten={kcal:0,protein:0,day:new Date().toDateString()};
function renderFood(){
  $('foodList').innerHTML = Object.entries(FOOD).map(([cat,items])=>`<h3>${cat.toUpperCase()}</h3>`+items.map(([n,k,p],i)=>
    `<div class="tile"><div><b>${n}</b><span>${k} kcal • ${p} g Eiweiß</span></div><button class="add" data-c="${cat}" data-i="${i}"><svg><use href="#i-plus"/></svg>ADD</button></div>`).join('')).join('');
  $('foodList').querySelectorAll('.add').forEach(b=>b.onclick=()=>{const [,k,p]=FOOD[b.dataset.c][b.dataset.i];eaten.kcal+=k;eaten.protein+=p;store.set('eaten',eaten);updFood()});
  updFood();
}
function updFood(){
  $('kcalTotal').textContent=eaten.kcal.toLocaleString('de-DE');
  $('proteinTotal').textContent=eaten.protein+' g Eiweiß';
  $('kcalBar').style.width=Math.min(100,eaten.kcal/32)+'%';
}
$('resetFood').onclick=()=>{eaten.kcal=0;eaten.protein=0;store.set('eaten',eaten);updFood()};

/* ---------- CATALOG ---------- */
// mode: elbow = Ellbogenwinkel, knee = Kniewinkel, hold = Haltezeit/Formcheck
const CATALOG = {
  "Arme, Schultern & Brust":{mode:'elbow',items:[["Klassische Liegestütze","4 × 15"],["Frauen-Liegestütze","4 × 12"],["Diamond Push-ups","3 × 10"],["Trizeps-Dips","3 × 12"],["Pike Push-ups","3 × 10"],["Decline Push-ups","3 × 10"],["Incline Push-ups","4 × 15"],["Plank-to-Push-up","3 × 8"]]},
  "Bauch & Rumpf":{mode:'hold',items:[["Klassische Plank","3 × 45 s"],["Side Plank","3 × 30 s je Seite"],["Crunches","4 × 20"],["Reverse Crunches","3 × 15"],["Bicycle Crunches","3 × 30"],["Mountain Climbers","4 × 40 s"],["Flutter Kicks","3 × 30 s"],["Russian Twist","3 × 24"],["Superman","3 × 15"]]},
  "Beine & Gesäß":{mode:'knee',items:[["Klassische Squats","4 × 20"],["Sumo Squats","4 × 15"],["Jump Squats","3 × 12"],["Ausfallschritte","3 × 12 je Bein"],["Backward Lunges","3 × 12 je Bein"],["Glute Bridges","4 × 15"],["Single-Leg Glute Bridges","3 × 12 je Bein"],["Wall Sit","3 × 45 s"]]}
};
function renderCatalog(){
  $('catalogList').innerHTML = Object.entries(CATALOG).map(([cat,c])=>`<h3>${cat.toUpperCase()}</h3>`+c.items.map(([n,s])=>
    `<div class="ex"><div><b>${n}</b><span>Empfehlung: ${s}</span></div><button class="launch" data-n="${n}" data-m="${c.mode}" data-s="${s}">CAM LAUNCH</button></div>`).join('')).join('');
  $('catalogList').querySelectorAll('.launch').forEach(b=>b.onclick=()=>launch(b.dataset.n,b.dataset.m,b.dataset.s));
}

/* ---------- AI CAM ---------- */
let exercise={name:'Klassische Liegestütze',mode:'elbow',target:15,sets:4,set:1};
let reps=0,phase='up',camOn=false,pose=null,stream=null,lastSpoken='',lastSpeakT=0,holdStart=0;
function launch(name,mode,sets){
  const m=sets.match(/(\d+)\s*×\s*(\d+)/);
  exercise={name,mode,sets:m?+m[1]:3,target:m?+m[2]:12,set:1,unit:/s/.test(sets)?'s':'WDH'};
  reps=0;phase='up';holdStart=0;
  $('camExercise').textContent=name;updCam();showTab('cam');
}
function updCam(){
  $('repCount').textContent=String(reps).padStart(3,'0');
  $('camSets').textContent=`Satz ${exercise.set} von ${exercise.sets} • Ziel: ${exercise.target} ${exercise.unit||'WDH'}`;
  $('repBar').style.width=Math.min(100,reps/exercise.target*100)+'%';
}
function say(t,force){
  const n=Date.now();
  if(!('speechSynthesis' in window)||(!force&&(t===lastSpoken&&n-lastSpeakT<4000)))return;
  lastSpoken=t;lastSpeakT=n;
  const u=new SpeechSynthesisUtterance(t);u.lang='de-DE';u.rate=1.05;
  speechSynthesis.cancel();speechSynthesis.speak(u);
  $('voiceTxt').textContent='LIVE VOICE COACH AKTIV';
}
function angle(a,b,c){
  const r=Math.atan2(c.y-b.y,c.x-b.x)-Math.atan2(a.y-b.y,a.x-b.x);
  let d=Math.abs(r*180/Math.PI);return d>180?360-d:d;
}
const LINKS=[[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24],[23,25],[25,27],[24,26],[26,28]];
function onResults(res){
  const cv=$('overlay'),v=$('video');
  cv.width=v.videoWidth;cv.height=v.videoHeight;
  const ctx=cv.getContext('2d');ctx.clearRect(0,0,cv.width,cv.height);
  const L=res.poseLandmarks;
  if(!L){setForm('KEINE PERSON ERKANNT – KAMERA ZURÜCKSTELLEN',true);return}
  ctx.lineWidth=4;ctx.strokeStyle='#CCFF00';
  LINKS.forEach(([a,b])=>{ctx.beginPath();ctx.moveTo(L[a].x*cv.width,L[a].y*cv.height);ctx.lineTo(L[b].x*cv.width,L[b].y*cv.height);ctx.stroke()});
  ctx.fillStyle='#00F0FF';
  [11,12,13,14,15,16,23,24,25,26,27,28].forEach(i=>{ctx.beginPath();ctx.arc(L[i].x*cv.width,L[i].y*cv.height,6,0,7);ctx.fill()});
  // sichtbarere Körperseite wählen
  const left=(L[11].visibility+L[13].visibility+L[23].visibility)>=(L[12].visibility+L[14].visibility+L[24].visibility);
  const [S,E,W,H,K,A]=(left?[11,13,15,23,25,27]:[12,14,16,24,26,28]).map(i=>L[i]);
  const m=exercise.mode;
  if(m==='elbow'||m==='knee'){
    const ang=m==='elbow'?angle(S,E,W):angle(H,K,A);
    $('angleTxt').textContent=Math.round(ang)+'°';
    if(ang<90&&phase==='up'){phase='down'}
    else if(ang>160&&phase==='down'){phase='up';reps++;updCam();say(String(reps),true);
      if(reps>=exercise.target){say('Satz '+exercise.set+' geschafft!',true);exercise.set=Math.min(exercise.sets,exercise.set+1);reps=0;updCam()}}
  }else{
    if(!holdStart)holdStart=Date.now();
    reps=Math.floor((Date.now()-holdStart)/1000);
    if(reps&&reps%10===0)say(reps+' Sekunden');
    updCam();
  }
  // Rücken-Check: Schulter–Hüfte–Knöchel soll eine Linie sein (nur Brett-Übungen)
  const plankLike=/Liegestütze|Push-up|Plank/.test(exercise.name)&&!/Pike|Dips/.test(exercise.name);
  if(plankLike){
    const back=angle(S,H,A);
    if(back<160){setForm('FORM CHECK: RÜCKEN GERADE HALTEN',true);say('Rücken gerade halten')}
    else setForm(`FORM CHECK: <span style="color:#CCFF00">KÖRPERLINIE OK (${Math.round(back)}°)</span>`);
  }else setForm('FORM CHECK: <span style="color:#CCFF00">TRACKING AKTIV</span>');
}
function setForm(t,bad){const f=$('formBanner');f.innerHTML=t;f.classList.toggle('bad',!!bad)}
async function startCam(){
  try{
    stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user',width:640,height:480},audio:false});
    const v=$('video');v.srcObject=stream;await v.play();
    if(!pose){
      pose=new Pose({locateFile:f=>`https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}`});
      pose.setOptions({modelComplexity:1,smoothLandmarks:true,minDetectionConfidence:.5,minTrackingConfidence:.5});
      pose.onResults(onResults);
    }
    camOn=true;$('camBtn').textContent='KAMERA STOPPEN';setForm('FORM CHECK: ANALYSE LÄUFT');
    say('Kamera bereit. Los geht\'s.',true);
    (async function loop(){if(!camOn)return;try{await pose.send({image:v})}catch(e){}requestAnimationFrame(loop)})();
  }catch(e){setForm('KAMERA-ZUGRIFF VERWEIGERT',true)}
}
function stopCam(){camOn=false;if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;$('camBtn').textContent='KAMERA STARTEN';setForm('FORM CHECK: KAMERA GESTOPPT')}
$('camBtn').onclick=()=>camOn?stopCam():startCam();
$('resetReps').onclick=()=>{reps=0;phase='up';holdStart=0;exercise.set=1;updCam()};

/* ---------- LUNG ---------- */
let bStart=0,bTimer=null;
const bBtn=$('breathBtn');
function bStop(){
  if(!bStart)return;clearInterval(bTimer);
  const s=(performance.now()-bStart)/1000;bStart=0;bBtn.classList.remove('on');
  $('breathTime').innerHTML=s.toFixed(1)+'<small> s</small>';
  let r;
  if(s<20)r='KRITISCH: Unter 20 s deutet auf schwache Lungenkapazität hin. Starte mit 20 min lockerem Gehen täglich, Atemübungen (4-6-8-Atmung) und reduziere Rauchen.';
  else if(s<30)r='DURCHSCHNITT: Solide Basis. 3× pro Woche 25 min Cardio im Zone-2-Tempo, dazu Zwerchfellatmung.';
  else if(s<45)r='GUT: Überdurchschnittliche Ausdauer. Baue 1× pro Woche Intervalle ein (4 × 4 min) und trainiere CO₂-Toleranz.';
  else r='STARKE LUNGE: Über 45 s – Athleten-Niveau. Halte es mit Tempoläufen und Schwimmen auf hohem Level.';
  $('breathResult').textContent=r;
}
bBtn.addEventListener('pointerdown',e=>{e.preventDefault();bStart=performance.now();bBtn.classList.add('on');
  bTimer=setInterval(()=>$('breathTime').innerHTML=((performance.now()-bStart)/1000).toFixed(1)+'<small> s</small>',100)});
['pointerup','pointercancel','pointerleave'].forEach(ev=>bBtn.addEventListener(ev,bStop));
bBtn.addEventListener('contextmenu',e=>e.preventDefault());

let marks=[];
function initMap(){
  if(map)return;
  map=L.map('map').setView([50.0,9.15],6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);
  map.on('click',e=>marks.push(L.marker(e.latlng).addTo(map)));
  if(navigator.geolocation)navigator.geolocation.getCurrentPosition(p=>map.setView([p.coords.latitude,p.coords.longitude],14),()=>{});
}
$('clearMarks').onclick=()=>{marks.forEach(m=>m.remove());marks=[]};
$('runCalc').onclick=()=>{
  const g=$('runGoal').value,w=Math.max(40,+$('runWeight').value||75);
  let km,txt;
  if(g==='fat'){km=400/(w*0.95);txt=`Ziel ca. 400 kcal pro Lauf: ${km.toFixed(1)} km in lockerem Tempo (Puls 65–75 %). 4–5× pro Woche.`}
  else if(g==='endurance'){km=6+w/25;txt=`Langer Dauerlauf: ${km.toFixed(1)} km, gleichmäßig. Steigere jede Woche um maximal 10 %.`}
  else{km=4+w/40;txt=`Intervall-Einheit: ${km.toFixed(1)} km gesamt, z. B. 6 × 400 m schnell mit 90 s Trabpause.`}
  $('runResult').textContent=`Empfehlung: ${km.toFixed(1)} km pro Tag. ${txt}`;
};

/* ---------- COACH ---------- */
const QUOTES=[
 "Du bist nicht müde. Du bist nur weich geworden. Steh auf und mach weiter.",
 "Niemand kommt, um dich zu retten. Hol dir deine Disziplin selbst.",
 "Wenn du denkst, du bist fertig, hast du erst 40 % gegeben.",
 "Komfort ist der Feind. Such dir jeden Tag das Unangenehme.",
 "Deine Ausreden sind schwerer als jede Hantel. Lass sie liegen.",
 "Schmerz ist der Preis. Zahl ihn heute, oder bereue es für immer.",
 "Der Kopf gibt auf, lange bevor der Körper es tut. Beherrsche ihn.",
 "Stay hard. Heute zählt, nicht morgen, nicht irgendwann.",
 "Keine Motivation? Gut. Disziplin braucht keine.",
 "Du schuldest deinem früheren Ich diese letzte Wiederholung."
];
let qi=Math.floor(Math.random()*QUOTES.length);
const showQuote=()=>$('quote').textContent=QUOTES[qi];
$('nextQuote').onclick=()=>{qi=(qi+1)%QUOTES.length;showQuote()};

function addMsg(t,who){const d=document.createElement('div');d.className='msg '+who;d.textContent=t;$('chatLog').appendChild(d);$('chatLog').scrollTop=1e6;return d}
async function ask(){
  const q=$('chatInput').value.trim();if(!q)return;
  $('chatInput').value='';addMsg(q,'me');
  if(GEMINI_API_KEY==="DEIN_KEY_HIER"){addMsg('Trage zuerst deinen Gemini API Key oben in app.js ein.','ai');return}
  const wait=addMsg('…','ai');
  try{
    const r=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        systemInstruction:{parts:[{text:'Du bist ein harter, direkter Fitness- und Mindset-Coach. Antworte auf Deutsch, kurz und praxisnah.'}]},
        contents:[{role:'user',parts:[{text:q}]}]
      })});
    const j=await r.json();
    if(!r.ok)throw new Error(j.error?.message||r.status);
    wait.textContent=j.candidates?.[0]?.content?.parts?.[0]?.text||'Keine Antwort erhalten.';
  }catch(e){wait.textContent='Fehler: '+e.message}
}
$('chatSend').onclick=ask;
$('chatInput').addEventListener('keydown',e=>{if(e.key==='Enter')ask()});

renderFood();renderCatalog();showQuote();updCam();
addMsg('Was ist dein Ziel heute?','ai');
