const SUPABASE_URL = "https://fgjtokbluxqnzotblnly.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnanRva2JsdXhxbnpvdGJsbmx5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE0MDQ1NTEsImV4cCI6MjEwNjk4MDU1MX0.pDD_2szeVPLCj9e0e-aUUnOg_4zryKODeNgP3cj4AKM";
const ghost=()=>new Proxy({},{get:(_,k)=>k==='classList'?{toggle(){},add(){},remove(){},contains:()=>false}:(k==='style'||k==='dataset')?{}:k==='querySelectorAll'?()=>[]:()=>{},set:()=>true});
const $ = id => document.getElementById(id)||ghost();
const store = { get:(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch{return d}}, set:(k,v)=>localStorage.setItem(k,JSON.stringify(v)) };

/* ---------- Tabs ---------- */
let map = null;
function showTab(t){
  document.querySelectorAll('.tab').forEach(s=>s.classList.toggle('active',s.id==='tab-'+t));
  document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('active',b.dataset.tab===t));
  if(t==='habits')updHabits();
  if(t==='lung'){initMap();setTimeout(()=>map&&map.invalidateSize(),150)}
  if(t!=='catalog'&&camOn) stopCam();
  window.scrollTo(0,0);
}
document.querySelectorAll('.nav button').forEach(b=>b.onclick=()=>showTab(b.dataset.tab));

/* ---------- PROFIL ---------- */
let profile=store.get('profile',null);
function needs(p){
  const bmr=10*p.weight+6.25*p.height-5*p.age+(p.sex==='m'?5:-161);
  let kcal=bmr*p.activity;
  if(p.goal==='lose'&&p.age>=18)kcal-=500;else if(p.goal==='gain')kcal+=300;
  kcal=Math.max(kcal,p.sex==='m'?1500:1200);
  const prot=p.weight*(p.goal==='gain'?2:p.goal==='lose'?1.8:1.5);
  return {bmr:Math.round(bmr),kcal:Math.round(kcal/10)*10,protein:Math.round(prot)};
}
const goals=()=>profile?needs(profile):{kcal:3200,protein:160,bmr:0};
function kmAdvice(goal,weight,level){
  const lv={'Anfänger':0.8,'Fortgeschritten':1,'Profi':1.25}[level]||1;
  let km,txt;
  if(goal==='lose'){km=400/(weight*0.95);txt='lockeres Tempo, Puls 65–75 %, 4–5× pro Woche, ca. 400 kcal pro Lauf'}
  else if(goal==='endurance'){km=5+weight/25;txt='gleichmäßiger Dauerlauf, pro Woche höchstens 10 % mehr'}
  else if(goal==='gain'){km=2.5;txt='kurze lockere Läufe, 2× pro Woche, damit der Muskelaufbau nicht leidet'}
  else{km=3.5+weight/50;txt='lockeres Tempo, 3× pro Woche'}
  return {km:+Math.min(15,Math.max(1.5,km*lv)).toFixed(1),txt};
}
function kmLine(){
  const a=kmAdvice(profile?profile.goal:'maintain',profile?profile.weight:75,profile?profile.level:'Anfänger');
  return `Lauf-Empfehlung vom Coach: ${a.km} km pro Laufeinheit (${a.txt}).`+(profile?'':' Fülle dein Profil aus für genauere Werte.');
}
function readProfile(){
  const p={sex:$('oSex').value,age:+$('oAge').value,height:+$('oH').value,weight:+$('oW').value,activity:+$('oAct').value,goal:$('oGoal').value,level:$('oLevel').value};
  const ok=p.age>=12&&p.age<=99&&p.height>=120&&p.height<=230&&p.weight>=30&&p.weight<=250;
  return ok?p:null;
}
function oInfo(){
  const p=readProfile();
  $('oInfo').textContent=p?`Dein Bedarf: ca. ${needs(p).kcal.toLocaleString('de-DE')} kcal und ${needs(p).protein} g Eiweiß pro Tag.`+(p.age<18&&p.goal==='lose'?' Unter 18 rechne ich ohne Kaloriendefizit.':''):'Trage Alter, Größe und Gewicht ein.';
}
function openProfile(){
  if(profile){$('oSex').value=profile.sex;$('oAge').value=profile.age;$('oH').value=profile.height;$('oW').value=profile.weight;$('oAct').value=profile.activity;$('oGoal').value=profile.goal;$('oLevel').value=profile.level}
  $('oClose').hidden=!profile;oInfo();$('onb').hidden=false;
}
['oSex','oAge','oH','oW','oAct','oGoal','oLevel'].forEach(id=>{$(id).addEventListener('input',oInfo);$(id).addEventListener('change',oInfo)});
$('oSave').onclick=()=>{
  const p=readProfile();if(!p){$('oInfo').textContent='Bitte gültige Werte für Alter, Größe und Gewicht eintragen.';return}
  profile=p;store.set('profile',p);$('onb').hidden=true;applyProfile();
};
$('oClose').onclick=()=>{$('onb').hidden=true};
$('profileBtn').onclick=openProfile;
function applyProfile(){
  updFood();
  if(!profile)return;
  $('pGoal').value={lose:'Fett verlieren',gain:'Muskelaufbau',endurance:'Ausdauer',maintain:'Allround-Fitness'}[profile.goal];
  $('pLevel').value=profile.level;
  $('runWeight').value=profile.weight;$('runGoal').value=profile.goal;
  const a=kmAdvice(profile.goal,profile.weight,profile.level);
  $('runResult').textContent=`Empfehlung: ${a.km} km pro Lauf – ${a.txt}.`;
}
function initProfile(){if(!profile)openProfile();else applyProfile()}

/* ---------- FOOD ---------- */
// [Name, kcal, Eiweiß, Einheit] je Einheit; ohne Einheit = Portion
const FOOD = {
  "Ei & Frühstück":[["Ei als Rührei",90,6.5,"Stück"],["Spiegelei",95,6.5,"Stück"],["Hartgekochtes Ei",78,6.5,"Stück"],["Omelett mit Gemüse",310,22],["Haferflocken mit Whey",420,32],["Overnight Oats",380,18],["Skyr mit Beeren",190,20],["Vollkorntoast mit Ei",320,17],["Protein-Pancake",120,9.3,"Stück"],["Porridge mit Banane",340,12],["Griechischer Joghurt mit Honig",230,15],["Avocado-Toast mit Ei",410,16],["Müsli mit Milch",390,14]],
  "Fast Food (Cleaned)":[["Grilled-Chicken-Burger",480,38],["Döner-Teller ohne Soße",560,42],["Chicken Wrap Vollkorn",450,34],["Reisbowl mit Hähnchen",620,45],["Subway 15 cm Hähnchen",330,24],["Burrito Bowl ohne Sourcreme",580,40],["Sushi-Stück",44,2,"Stück"],["Gyros-Pita mit Tzatziki",520,30],["Chicken Nugget",43,2.5,"Stück"],["Pizza Margherita (¼)",250,11],["Kebab-Salat",390,33],["Pulled-Chicken-Sandwich",470,36]],
  "Fleisch & Fisch":[["Hähnchenbrust 200 g",330,62],["Rinderhack 200 g (mager)",340,42],["Lachsfilet 150 g",310,31],["Thunfisch Dose",120,26],["Putenbrust 150 g",165,35],["Steak 200 g",430,50],["Garnelen 150 g",150,32],["Forelle 150 g",210,30],["Schweinefilet 200 g",250,44],["Hähnchenschenkel 200 g",380,40]],
  "Salate & Bowls":[["Thunfisch-Salat",340,31],["Quinoa-Bowl mit Lachs",640,40],["Hähnchen-Caesar (light)",410,36],["Linsen-Bowl",480,24],["Griechischer Salat",290,9],["Poke Bowl mit Lachs",560,34],["Kichererbsen-Bowl",450,19],["Caprese-Salat",320,16],["Eiersalat mit Gemüse",350,22],["Rindfleisch-Reis-Bowl",650,44]],
  "Beilagen & Carbs":[["Basmatireis 200 g gekocht",260,5],["Vollkornnudeln 250 g gekocht",350,13],["Süßkartoffel 200 g",180,3],["Pellkartoffeln 300 g",230,6],["Vollkornbrot-Scheibe",100,4,"Scheibe"],["Couscous 200 g gekocht",230,8],["Haferbrei 60 g Flocken",220,8],["Reiswaffel",35,1,"Stück"],["Gemüse-Pfanne",150,6]],
  "Obst & Gemüse":[["Banane",105,1,"Stück"],["Apfel",80,0.4,"Stück"],["Beerenmix 150 g",75,1],["Orange",65,1,"Stück"],["Brokkoli 200 g",70,6],["Gurke & Paprika-Snack",50,2],["Avocado",320,4,"Stück"],["Trauben 150 g",100,1],["Dattel",66,0.4,"Stück"]],
  "Protein-Snacks":[["Proteinriegel",210,20,"Stück"],["Hüttenkäse 200 g",180,22],["Beef Jerky 50 g",130,20],["Mandeln 30 g",175,6],["Magerquark 250 g",170,31],["Erdnussbutter (2 EL)",190,8],["Proteinpudding",160,20,"Stück"],["Walnüsse 30 g",195,5],["Thunfisch-Reiswaffel",150,14,"Stück"],["Cashews 30 g",165,5],["Edamame 100 g",120,11]],
  "Chinesisch":[["Gebratener Reis mit Ei",520,14],["Chow Mein (Nudeln)",560,20],["Hühnchen süß-sauer",480,24],["Rindfleisch mit Brokkoli",380,30],["Kung Pao Chicken",450,32],["Mapo Tofu",340,19],["Gebratener Tofu mit Gemüse",320,20],["Wan-Tan-Suppe",260,14],["Dim Sum (Teigtasche)",45,2.5,"Stück"],["Frühlingsrolle",120,3,"Stück"],["Pekingente",400,28],["Gedämpfter Reis 200 g",260,5]],
  "Japanisch & Koreanisch":[["Nigiri Lachs",55,3.5,"Stück"],["Maki-Röllchen",40,1.5,"Stück"],["Ramen mit Ei",550,24],["Miso-Suppe",60,4],["Teriyaki-Hähnchen mit Reis",560,38],["Gyoza",55,3,"Stück"],["Onigiri",180,4,"Stück"],["Udon-Suppe",400,16],["Katsu-Curry",700,30],["Bibimbap",560,24],["Bulgogi mit Reis",590,36],["Kimchi 100 g",15,1],["Tteokbokki",380,8]],
  "Thai & Vietnamesisch":[["Pad Thai mit Hähnchen",600,28],["Grünes Curry mit Hähnchen",520,30],["Massaman Curry",620,28],["Tom Yum Suppe",170,16],["Tom Kha Gai",330,22],["Pho Bo",450,30],["Bun Cha",520,28],["Sommerrolle",80,4,"Stück"],["Papaya-Salat",120,3],["Reisnudel-Salat mit Garnelen",380,24],["Banh Mi",480,22],["Thai-Basilikum-Hähnchen mit Reis",560,34],["Mango Sticky Rice",380,5]],
  "Indisch":[["Chicken Tikka Masala",480,34],["Butter Chicken",520,32],["Dal (Linsen-Curry)",300,16],["Palak Paneer",380,20],["Chana Masala",340,14],["Lamm Rogan Josh",480,32],["Aloo Gobi",260,6],["Hähnchen-Biryani",620,30],["Tandoori-Hähnchenkeule",250,30],["Naan",260,8,"Stück"],["Chapati / Roti",100,3,"Stück"],["Samosa",260,5,"Stück"],["Raita 100 g",60,3],["Masala Dosa",400,9],["Idli",40,1.5,"Stück"],["Mango Lassi",250,8,"Glas"]],
  "Orientalisch & Türkisch":[["Falafel",57,2.5,"Stück"],["Hummus 50 g",85,3],["Shawarma-Teller",620,42],["Köfte-Spieß",190,15,"Stück"],["Adana Kebab",480,30],["Lahmacun",280,12,"Stück"],["Pide mit Hack",700,28],["Tabouleh",150,4],["Baba Ghanoush 100 g",120,3],["Linsensuppe",220,12],["Halloumi 50 g",160,11],["Menemen",280,14],["Shakshuka",300,16],["Ayran",70,4,"Glas"]],
  "Italienisch":[["Spaghetti Bolognese",650,30],["Pasta Arrabbiata",520,16],["Lasagne",580,28],["Pizza Salami (¼)",300,13],["Pilz-Risotto",480,12],["Minestrone",180,8],["Bruschetta",90,2.5,"Stück"],["Gnocchi mit Tomatensauce",480,12],["Pasta mit Hähnchen und Pesto",620,38],["Hühnchen Parmigiana",600,46],["Tiramisu",450,7]],
  "Mexikanisch":[["Chicken Burrito",700,38],["Taco mit Hähnchen",170,12,"Stück"],["Quesadilla",520,26],["Guacamole 50 g",90,1],["Chili con Carne",480,32],["Nachos mit Käse",520,12],["Huevos Rancheros",420,20],["Fajita-Pfanne",450,38],["Bohnensalat",250,12],["Enchiladas",560,30]],
  "Getränke":[["Whey-Shake mit Wasser",120,24],["Whey-Shake mit Milch",280,32],["Mass-Gainer-Shake",650,50],["Magermilch 500 ml",175,17],["Vollmilch 500 ml",320,17],["Kaffee schwarz",5,0,"Tasse"],["Kaffee mit Milch",45,2,"Tasse"],["Latte Macchiato",150,8,"Glas"],["Protein-Kaffee",160,20],["Smoothie Banane-Beere",220,4,"Glas"],["Orangensaft 250 ml",110,2,"Glas"],["Kokoswasser 330 ml",60,1,"Dose"],["Hafermilch 250 ml",120,3,"Glas"],["Kakao mit Milch",190,8,"Tasse"],["Proteinshake Schoko (RTD)",160,30,"Flasche"],["Isotonisches Getränk 500 ml",130,0,"Flasche"],["Cola Zero",1,0,"Dose"],["Energy Drink Zuckerfrei",10,0,"Dose"],["Grüner Tee",2,0,"Tasse"],["Wasser",0,0,"Glas"]]
};
let eaten=store.get('eaten',null);
if(!eaten||eaten.day!==new Date().toDateString())eaten={kcal:0,protein:0,day:new Date().toDateString()};
const foodItem=t=>FOOD[t.dataset.c][t.dataset.i];
function calcTile(t){
  const [,k,p]=foodItem(t),q=Math.max(0.5,+t.querySelector('.q').value||1);
  t.querySelector('.sum').textContent=`= ${Math.round(k*q)} kcal • ${(Math.round(p*q*10)/10)} g Eiweiß`;
}
function renderFood(){
  $('foodList').innerHTML=Object.entries(FOOD).map(([cat,items],ci)=>
    `<details class="acc"${ci===0?' open':''}><summary><span>${cat}</span><em>${items.length}</em><svg class="chev"><use href="#i-chev"/></svg></summary><div class="acc-body">`+
    items.map(([n,k,p,u],i)=>{const unit=u||'Portion',step=u?1:0.5;
      return `<div class="tile" data-c="${cat}" data-i="${i}" data-step="${step}"><b>${n}</b><span class="per">je ${unit}: ${k} kcal • ${p} g Eiweiß</span><div class="row2"><div class="qty"><button class="qm" aria-label="Weniger">−</button><input class="q" type="number" inputmode="decimal" min="0.5" step="${step}" value="1" aria-label="Menge in ${unit}"><button class="qp" aria-label="Mehr">+</button></div><span class="sum"></span><button class="add"><svg><use href="#i-plus"/></svg>ADD</button></div></div>`}).join('')+
    `</div></details>`).join('');
  document.querySelectorAll('#foodList .tile').forEach(calcTile);
  updFood();
}
$('foodList').addEventListener('click',e=>{
  const t=e.target.closest('.tile');if(!t)return;
  const q=t.querySelector('.q'),st=+t.dataset.step;
  if(e.target.closest('.qm')){q.value=Math.max(0.5,(+q.value||1)-st);calcTile(t)}
  else if(e.target.closest('.qp')){q.value=(+q.value||1)+st;calcTile(t)}
  else if(e.target.closest('.add')){
    const [,k,p]=foodItem(t),n=Math.max(0.5,+q.value||1),b=e.target.closest('.add');
    eaten.kcal+=Math.round(k*n);eaten.protein=Math.round((eaten.protein+p*n)*10)/10;
    store.set('eaten',eaten);updFood();b.textContent='OK';setTimeout(()=>{b.innerHTML='<svg><use href="#i-plus"/></svg>ADD'},800);
  }
});
$('foodList').addEventListener('input',e=>{const t=e.target.closest('.tile');if(t)calcTile(t)});
function updFood(){
  const g=goals();
  $('kcalTotal').textContent=eaten.kcal.toLocaleString('de-DE');
  $('kcalGoal').textContent=g.kcal.toLocaleString('de-DE');
  $('proteinTotal').textContent=`${Math.round(eaten.protein)} / ${g.protein} g Eiweiß`;
  $('kcalBar').style.width=Math.min(100,eaten.kcal/g.kcal*100)+'%';
  $('protBar').style.width=Math.min(100,eaten.protein/g.protein*100)+'%';
}
$('resetFood').onclick=()=>{eaten.kcal=0;eaten.protein=0;store.set('eaten',eaten);updFood()};

/* ---------- CATALOG ---------- */
// mode: elbow = Ellbogenwinkel, knee = Kniewinkel, hold = Haltezeit/Formcheck; Einträge: [Name, Empfehlung, Tipp]
const CATALOG = {
  "Arme, Schultern & Brust":{mode:'elbow',items:[["Klassische Liegestütze","4 × 15","Brust und Trizeps. Körper bleibt eine gerade Linie."],["Frauen-Liegestütze","4 × 12","Knie am Boden, Rumpf bleibt gespannt."],["Diamond Push-ups","3 × 10","Trizeps. Hände bilden eine Raute unter der Brust."],["Trizeps-Dips","3 × 12","Stuhlkante, Ellbogen zeigen nach hinten."],["Pike Push-ups","3 × 10","Schultern. Hüfte hoch, Kopf zwischen die Arme."],["Decline Push-ups","3 × 10","Füße erhöht, trainiert die obere Brust."],["Incline Push-ups","4 × 15","Hände erhöht, ideal für den Einstieg."],["Plank-to-Push-up","3 × 8","Wechsel von Unterarmen auf Hände, Hüfte ruhig."]]},
  "Bauch & Rumpf":{mode:'hold',items:[["Klassische Plank","3 × 45 s","Schultern über Ellbogen, Po nicht hochschieben."],["Side Plank","3 × 30 s","Hüfte oben halten, Körper in einer Linie."],["Crunches","4 × 20","Nur die Schultern anheben, Nacken locker."],["Reverse Crunches","3 × 15","Becken einrollen, Beine kontrolliert heben."],["Bicycle Crunches","3 × 30","Ellbogen zum Gegenknie, langsam drehen."],["Mountain Climbers","4 × 40 s","Hüfte tief, Knie schnell zur Brust."],["Flutter Kicks","3 × 30 s","Beine knapp über dem Boden, Rücken flach."],["Russian Twist","3 × 24","Oberkörper leicht zurück, Drehung aus der Mitte."],["Superman","3 × 15","Rücken strecken, oben kurz halten."]]},
  "Beine & Gesäß":{mode:'knee',items:[["Klassische Squats","4 × 20","Knie nach außen, Rücken gerade, Fersen am Boden."],["Sumo Squats","4 × 15","Breiter Stand, trainiert die Innenseiten."],["Jump Squats","3 × 12","Explosiv hoch, weich landen."],["Ausfallschritte","3 × 12","Knie über dem Fuß, Oberkörper aufrecht."],["Backward Lunges","3 × 12","Schritt nach hinten, schonender für die Knie."],["Glute Bridges","4 × 15","Oben den Po kurz anspannen."],["Single-Leg Glute Bridges","3 × 12","Ein Bein gestreckt, Becken bleibt gerade."],["Wall Sit","3 × 45 s","Oberschenkel waagerecht, Rücken an der Wand."]]}
};
const ALLEX=Object.values(CATALOG).flatMap(c=>c.items.map(([n,s])=>({name:n,sets:s,mode:c.mode})));
function matchEx(name){
  const x=String(name).toLowerCase();
  return ALLEX.find(e=>e.name.toLowerCase()===x)||ALLEX.find(e=>{const n=e.name.toLowerCase();return x.includes(n)||n.includes(x)});
}
const catItem=([n,s,t],m)=>`<div class="ex"><div><b>${n}</b><span>Empfehlung: ${s}</span><span class="tip">${t}</span></div><button class="launch" data-n="${n}" data-m="${m}" data-s="${s}">CAM LAUNCH</button></div>`;
const catHtml=()=>Object.entries(CATALOG).map(([cat,c],ci)=>`<details class="acc"${ci===0?' open':''}><summary><span>${cat}</span><em>${c.items.length}</em><svg class="chev"><use href="#i-chev"/></svg></summary><div class="acc-body">${c.items.map(i=>catItem(i,c.mode)).join('')}</div></details>`).join('');
function renderCatalog(){ $('catalogList').innerHTML=catHtml() }
document.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('.launch');
  if(b)launch(b.dataset.n,b.dataset.m,b.dataset.s);
});

/* ---------- AI CAM ---------- */
let exercise={name:'Klassische Liegestütze',mode:'elbow',target:15,sets:4,set:1};
let reps=0,phase='up',camOn=false,pose=null,stream=null,lastSpoken='',lastSpeakT=0,holdStart=0;
function launch(name,mode,sets){
  const m=sets.match(/(\d+)\s*×\s*(\d+)/);
  exercise={name,mode,sets:m?+m[1]:3,target:m?+m[2]:12,set:1,unit:/s/.test(sets)?'s':'WDH'};
  reps=0;phase='up';holdStart=0;
  $('camExercise').textContent=name;updCam();showTab('catalog');$('camAcc').open=true;setTimeout(()=>$('camAcc').scrollIntoView({behavior:'smooth',block:'start'}),50);
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
  const w=Math.max(40,+$('runWeight').value||75);
  const a=kmAdvice($('runGoal').value,w,profile?profile.level:'Anfänger');
  $('runResult').textContent=`Empfehlung: ${a.km} km pro Lauf – ${a.txt}.`;
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
  const wait=addMsg('…','ai');
  try{wait.textContent=(await api('chat',{message:q})).text||'Keine Antwort erhalten.'}
  catch(e){wait.textContent='Fehler: '+e.message}
}
$('chatSend').onclick=ask;
$('chatInput').addEventListener('keydown',e=>{if(e.key==='Enter')ask()});


/* ---------- SUPABASE API ---------- */
const deviceId=(()=>{let d=localStorage.getItem('deviceId');if(!d){d=crypto.randomUUID();localStorage.setItem('deviceId',d)}return d})();
async function api(action,data={}){
  const r=await fetch(SUPABASE_URL+'/functions/v1/api',{method:'POST',
    headers:{'Content-Type':'application/json',apikey:SUPABASE_ANON,Authorization:'Bearer '+SUPABASE_ANON},
    body:JSON.stringify({action,device_id:deviceId,...data})});
  const j=await r.json().catch(()=>({}));
  if(!r.ok||j.error)throw new Error(j.error||('HTTP '+r.status));
  return j;
}
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});

/* ---------- WOCHENPLAN + PUSH ---------- */
const DAYS=['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'];
let draft=null;
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const planHtml=p=>p.days.map(d=>`<div class="pd${d.rest?' rest':''}"><b>${esc(d.day)}</b><em>${d.rest?'RUHETAG':esc(d.focus)}</em>${d.rest?'':`<div class="pex">`+(d.exercises||[]).map(x=>{const m=matchEx(x.name),sets=/^\d+$/.test(String(x.reps))?`${x.sets} × ${x.reps}`:(m?m.sets:`${x.sets} × 12`);return `<div class="pe"><span>${esc(x.name)} – ${esc(x.sets)} × ${esc(x.reps)}</span>${m?`<button class="launch mini" data-n="${esc(m.name)}" data-m="${m.mode}" data-s="${esc(sets)}">CAM</button>`:''}</div>`}).join('')+`</div>`}</div>`).join('');
function b64ToU8(s){const p='='.repeat((4-s.length%4)%4),r=atob((s+p).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(r,c=>c.charCodeAt(0))}
async function enablePush(){
  if(!('serviceWorker' in navigator)||!('PushManager' in window))throw new Error('Push ist hier nicht verfügbar. Auf dem iPhone: in Safari Teilen, dann "Zum Home-Bildschirm", und die App von dort öffnen.');
  if(await Notification.requestPermission()!=='granted')throw new Error('Benachrichtigungen wurden nicht erlaubt.');
  const reg=await navigator.serviceWorker.ready;
  let sub=await reg.pushManager.getSubscription();
  if(!sub){const {publicKey}=await api('config');sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64ToU8(publicKey)})}
  await api('subscribe',{subscription:sub.toJSON()});
}
function buildReminders(plan,time){
  const [hh,mm]=time.split(':').map(Number),now=new Date(),out=[];
  plan.days.forEach(d=>{
    if(d.rest)return;
    const idx=DAYS.indexOf(d.day);if(idx<0)return;
    for(let o=0;o<=7;o++){
      const t=new Date(now);t.setDate(now.getDate()+o);t.setHours(hh,mm,0,0);
      if((t.getDay()+6)%7===idx&&t>now){
        out.push({remind_at:t.toISOString(),title:'Training heute: '+d.focus,body:(d.exercises||[]).slice(0,4).map(x=>x.name).join(', ')+'. Los geht\'s!'});break;
      }
    }
  });
  return out;
}
$('planBtn').onclick=async()=>{
  const btn=$('planBtn');btn.disabled=true;btn.textContent='PLAN WIRD ERSTELLT…';$('planMsg').textContent='';$('planDraft').innerHTML='';
  const names=' | Nutze bevorzugt diese Übungsnamen: Klassische Liegestütze, Diamond Push-ups, Pike Push-ups, Klassische Squats, Ausfallschritte, Glute Bridges, Klassische Plank, Crunches, Mountain Climbers, Wall Sit';
  const inputs={goal:$('pGoal').value,level:$('pLevel').value,days:+$('pDays').value,minutes:+$('pMin').value,equipment:$('pEquip').value,age:profile?profile.age:'',weight:profile?profile.weight:'',notes:$('pNotes').value.slice(0,100)+names};
  try{
    const {plan}=await api('plan',{inputs});draft={plan,inputs,time:$('pTime').value||'18:00'};
    $('planDraft').innerHTML=`<h2>${esc(plan.title)}</h2><p class="muted">${esc(plan.summary)}</p><p class="kmline">${esc(kmLine())}</p>${planHtml(plan)}<button class="primary" id="acceptPlan">PLAN ANNEHMEN</button>`;
    $('acceptPlan').onclick=acceptPlan;
  }catch(e){$('planMsg').textContent='Fehler: '+e.message}
  btn.disabled=false;btn.textContent='PLAN ERSTELLEN';
};
async function acceptPlan(){
  const btn=$('acceptPlan');btn.disabled=true;
  try{
    await enablePush();
    const reminders=buildReminders(draft.plan,draft.time);
    const r=await api('accept',{plan:draft.plan,inputs:draft.inputs,reminders});
    store.set('activePlan',{plan:draft.plan,time:draft.time});
    $('planDraft').innerHTML='';$('planMsg').textContent=`Plan angenommen. ${r.reminders} Erinnerungen um ${draft.time} Uhr sind geplant.`;
    renderActive();
  }catch(e){$('planMsg').textContent='Fehler: '+e.message;btn.disabled=false}
}
function renderActive(){
  const a=store.get('activePlan',null);
  $('activeCard').hidden=!a;
  if(a)$('activePlan').innerHTML=`<h2>${esc(a.plan.title)}</h2><p class="muted">Erinnerung täglich um ${esc(a.time)} Uhr an Trainingstagen.</p><p class="kmline">${esc(kmLine())}</p>${planHtml(a.plan)}`;
}
$('cancelPlan').onclick=async()=>{
  try{await api('cancel');localStorage.removeItem('activePlan');renderActive();$('planMsg').textContent='Plan beendet, Erinnerungen gelöscht.'}
  catch(e){$('planMsg').textContent='Fehler: '+e.message}
};

/* ---------- EIGENER GEMINI-KEY ---------- */
function showKey(has){
  $('keyState').textContent=has?'Key ist sicher bei Supabase gespeichert. Er liegt nicht im Browser.':'Kein Key hinterlegt. Hol dir kostenlos einen auf aistudio.google.com/apikey und trag ihn hier ein.';
  $('keyDel').hidden=!has;$('keySave').textContent=has?'KEY ERSETZEN':'KEY SPEICHERN';
}
$('keySave').onclick=async()=>{
  const k=$('keyInput').value.trim();if(!k){$('keyMsg').textContent='Bitte Key eintragen.';return}
  $('keySave').disabled=true;$('keyMsg').textContent='Key wird geprüft…';
  try{await api('set_key',{key:k});$('keyInput').value='';$('keyMsg').textContent='Key gespeichert.';showKey(true)}
  catch(e){$('keyMsg').textContent='Fehler: '+e.message}
  $('keySave').disabled=false;
};
$('keyDel').onclick=async()=>{
  try{await api('delete_key');$('keyMsg').textContent='Key gelöscht.';showKey(false)}catch(e){$('keyMsg').textContent='Fehler: '+e.message}
};
api('has_key').then(r=>showKey(r.has)).catch(()=>{});


/* ---------- HABITS ---------- */
const MILES=[1,3,7,14,30,60,90,180,365];
const TIPS={
  rauch:["Trigger notieren (Kaffee, Pause, Stress) und genau dort etwas anderes tun.","Der Drang fällt nach 10–15 Minuten ab: Wasser trinken oder 20 Kniebeugen machen.","Feuerzeug und Aschenbecher entsorgen, Wohnung lüften.","Ein Rückfall ist kein Neustart bei null: Ursache finden und weitermachen."],
  alkohol:["Kein Alkohol im Haus, Alternativen kaltstellen (alkoholfrei, Soda, Tee).","Plane Abende mit Training oder Treffen ohne Bar.","Sag vorher laut, dass du nicht trinkst, und bestell zuerst dein Getränk.","Bei regelmäßigem, starkem Konsum nicht allein abrupt aufhören: Entzug kann gefährlich sein, sprich vorher mit einem Arzt."],
  fluch:["Lege ein Ersatzwort fest (zum Beispiel „Mist“) und nutze es konsequent.","Atme kurz aus, bevor du sprichst, besonders bei Ärger.","Bitte einen Freund, dich freundlich zu erinnern.","Notiere jeden Ausrutscher mit Auslöser, so erkennst du Muster."],
  porn:["Handy nachts außerhalb des Betts laden, Filter und Blocker installieren.","Trigger erkennen (Langeweile, Einsamkeit, spät abends) und sofort aufstehen und den Ort wechseln.","Bei Drang: 20 Liegestütze oder ein zügiger Spaziergang an der frischen Luft.","Sprich mit einer Vertrauensperson oder Beratungsstelle, wenn es dich belastet."],
  def:["Schreibe auf, warum du aufhören willst, und lies es bei Drang.","Erkenne deine Trigger und plane eine Ersatzhandlung.","Entferne Auslöser aus deinem Umfeld.","Feiere jeden Tag und mach nach einem Rückfall sofort weiter."]
};
const tipsFor=n=>{n=n.toLowerCase();return TIPS[n.includes('rauch')||n.includes('zigar')?'rauch':n.includes('alk')?'alkohol':n.includes('fluch')?'fluch':n.includes('porn')?'porn':'def']};
let habits=store.get('habits',[]);
const saveH=()=>store.set('habits',habits);
const days=h=>(Date.now()-h.since)/864e5;
function fmt(ms){const d=Math.floor(ms/864e5),h=Math.floor(ms%864e5/36e5),m=Math.floor(ms%36e5/6e4);return `${d} T ${String(h).padStart(2,'0')} Std ${String(m).padStart(2,'0')} Min`}
function renderHabits(){
  $('habitList').innerHTML=habits.length?habits.map(h=>`<div class="card habit" data-id="${h.id}">
    <div class="row between"><span class="label">${esc(h.name)}</span><span class="label">Rückfälle: ${h.relapses}</span></div>
    <div class="big hc"></div><p class="muted hnext"></p><div class="bar"><i class="hbar"></i></div><p class="muted small hextra"></p>
    <button class="primary sosBtn">CRAVING SOS</button><div class="sos" hidden></div>
    <details class="acc plan-d"><summary><span>Dein Plan</span><svg class="chev"><use href="#i-chev"/></svg></summary><div class="acc-body"><ul class="tips">${tipsFor(h.name).map(t=>`<li>${esc(t)}</li>`).join('')}</ul><button class="ghost aiPlan">Plan vom Coach</button><p class="muted aiOut"></p></div></details>
    <div class="row gap"><button class="ghost relapse">Rückfall melden</button><button class="ghost del">Entfernen</button></div></div>`).join(''):'<p class="muted">Noch keine Gewohnheit angelegt. Starte oben, der Zähler läuft ab sofort.</p>';
  updHabits();
}
function updHabits(){
  document.querySelectorAll('.habit').forEach(c=>{
    const h=habits.find(x=>x.id===c.dataset.id);if(!h)return;
    const ms=Date.now()-h.since,d=days(h),next=MILES.find(m=>m>d)||MILES[MILES.length-1];
    c.querySelector('.hc').textContent=fmt(ms);
    c.querySelector('.hnext').textContent=d>=365?'Ein Jahr geschafft. Du bist ein anderer Mensch.':`Nächstes Ziel: ${next} ${next===1?'Tag':'Tage'}`;
    c.querySelector('.hbar').style.width=Math.min(100,d/next*100)+'%';
    c.querySelector('.hextra').textContent=`Rekord: ${Math.max(h.best||0,Math.floor(d))} Tage`+(h.cost?` • Gespart: ${(d*h.cost).toFixed(2).replace('.',',')} €`:'');
  });
}
setInterval(()=>{if($('tab-habits').classList&&$('tab-habits').classList.contains('active'))updHabits()},1000);
$('habitAdd').onclick=()=>{
  let name=$('habitType').value;if(name==='Eigene')name=($('habitCustom').value||'').trim().slice(0,30)||'Eigene Gewohnheit';
  habits.push({id:String(Date.now()),name,since:Date.now(),best:0,relapses:0,cost:parseFloat(($('habitCost').value||'').replace(',','.'))||0});
  saveH();$('habitCustom').value='';$('habitCost').value='';renderHabits();
};
const SOSMSG=["Atme 4 Sekunden ein.","Atme 6 Sekunden aus.","Der Drang ist eine Welle. Sie steigt und fällt wieder.","Du musst nichts tun. Nur warten.","Denk an deinen Zähler. Den willst du nicht verlieren."];
let sosT=null;
function sos(card){
  const box=card.querySelector('.sos');clearInterval(sosT);box.hidden=false;let s=90,i=0;
  const paint=()=>{box.innerHTML=`<div class="sos-t">${s}</div><p>${SOSMSG[i%SOSMSG.length]}</p>`};paint();
  sosT=setInterval(()=>{s--;if(s%5===0)i++;if(s<=0){clearInterval(sosT);box.innerHTML='<p><b>Geschafft.</b> Der Höhepunkt ist vorbei. Du bist stärker als der Drang.</p>';return}paint()},1000);
}
$('habitList').addEventListener('click',async e=>{
  const c=e.target.closest('.habit');if(!c)return;
  const h=habits.find(x=>x.id===c.dataset.id);if(!h)return;
  if(e.target.closest('.sosBtn'))sos(c);
  else if(e.target.closest('.relapse')){
    if(!confirm('Rückfall melden? Dein Zähler startet neu, dein Rekord bleibt erhalten.'))return;
    h.best=Math.max(h.best||0,Math.floor(days(h)));h.relapses++;h.since=Date.now();saveH();renderHabits();
    $('habitMsg').textContent='Ein Rückfall ist kein Scheitern. Aufgeben wäre eins. Dein Rekord steht, und heute fängst du wieder an.';
  }
  else if(e.target.closest('.del')){if(confirm('Gewohnheit wirklich entfernen?')){habits=habits.filter(x=>x!==h);saveH();renderHabits()}}
  else if(e.target.closest('.aiPlan')){
    const out=c.querySelector('.aiOut');out.textContent='Coach schreibt deinen Plan…';
    try{out.textContent=(await api('chat',{message:`Ich will mit "${h.name}" aufhören. Aktuell ${Math.floor(days(h))} Tage clean, ${h.relapses} Rückfälle. Gib mir einen kurzen, harten aber motivierenden 7-Tage-Plan mit konkreten Tagesaufgaben und Trigger-Strategien. Maximal 900 Zeichen.`})).text}
    catch(err){out.textContent='Fehler: '+err.message}
  }
});
$('habitType').onchange=()=>{$('habitCustom').hidden=$('habitType').value!=='Eigene'};

[renderFood,renderCatalog,showQuote,updCam,renderActive,renderHabits,initProfile].forEach(f=>{try{f()}catch(e){console.error(f.name,e)}});
addMsg('Was ist dein Ziel heute?','ai');
