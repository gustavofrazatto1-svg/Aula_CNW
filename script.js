const F=[
{id:1,t:"Cidade de Deus",y:2002,g:"Drama",d:"Fernando Meirelles",s:8.6,h:25,x:"A vida de jovens numa comunidade do Rio de Janeiro entre os anos 60 e 80, narrada com energia e crueza."},
{id:2,t:"Parasita",y:2019,g:"Thriller",d:"Bong Joon-ho",s:8.5,h:150,x:"Uma família pobre se infiltra, aos poucos, na casa de uma família rica, e nada sai como planejado."},
{id:3,t:"O Poderoso Chefão",y:1972,g:"Crime",d:"Francis Ford Coppola",s:9.2,h:5,x:"A saga de uma família mafiosa e a transformação de um filho relutante em herdeiro do império."},
{id:4,t:"Interestelar",y:2014,g:"Ficção",d:"Christopher Nolan",s:8.7,h:215,x:"Com a Terra em colapso, astronautas cruzam um buraco de minhoca em busca de um novo lar."},
{id:5,t:"Pulp Fiction",y:1994,g:"Crime",d:"Quentin Tarantino",s:8.9,h:45,x:"Histórias cruzadas de criminosos em Los Angeles, entre diálogos afiados e violência estilizada."},
{id:6,t:"A Viagem de Chihiro",y:2001,g:"Animação",d:"Hayao Miyazaki",s:8.6,h:180,x:"Uma menina fica presa num mundo de espíritos e precisa trabalhar numa casa de banhos para libertar os pais."},
{id:7,t:"Central do Brasil",y:1998,g:"Drama",d:"Walter Salles",s:8.0,h:35,x:"Uma ex-professora e um garoto órfão atravessam o sertão atrás de um pai que ele nunca conheceu."},
{id:8,t:"Mad Max: Estrada da Fúria",y:2015,g:"Ação",d:"George Miller",s:8.1,h:20,x:"Uma perseguição ininterrupta pelo deserto pós-apocalíptico contra um tirano e seu exército."},
{id:9,t:"Whiplash",y:2014,g:"Drama",d:"Damien Chazelle",s:8.5,h:350,x:"Um jovem baterista enfrenta um professor impiedoso na busca pela perfeição."},
{id:10,t:"Clube da Luta",y:1999,g:"Thriller",d:"David Fincher",s:8.8,h:12,x:"Um funcionário insone encontra um vendedor de sabão carismático e funda um clube subterrâneo."}
];
let R={};try{R=JSON.parse(localStorage.getItem("claq")||"{}")}catch(e){}
const save=()=>{try{localStorage.setItem("claq",JSON.stringify(R))}catch(e){}};
const $=i=>document.getElementById(i);
const grad=h=>`linear-gradient(180deg,hsl(${h} 70% 35%),hsl(${(h+40)%360} 60% 12%))`;
const avg=id=>{const a=R[id]||[];return a.length?a.reduce((s,r)=>s+r.n,0)/a.length:0};
const st=n=>"★".repeat(Math.round(n))+"☆".repeat(5-Math.round(n));
let filter="Todos",cur=null,pick=0;
const genres=["Todos",...new Set(F.map(f=>f.g))];
$("chips").innerHTML=genres.map(g=>`<button class="chip${g=="Todos"?" on":""}" data-g="${g}">${g}</button>`).join("");
$("chips").onclick=e=>{const b=e.target.closest(".chip");if(!b)return;filter=b.dataset.g;document.querySelectorAll(".chip").forEach(c=>c.classList.toggle("on",c===b));draw()};
$("sort").onchange=draw;
function draw(){
 const k=$("sort").value;
 const l=F.filter(f=>filter=="Todos"||f.g==filter).sort((a,b)=>k=="score"?b.s-a.s:k=="year"?b.y-a.y:a.t.localeCompare(b.t));
 $("grid").innerHTML=l.map(f=>{const a=avg(f.id);return `<button class="film" data-id="${f.id}"><div class="poster" style="background:${grad(f.h)}"><span class="badge">${f.s.toFixed(1)}</span><h3>${f.t}</h3><small>${f.y} · ${f.g}</small></div><div class="meta"><span>${f.d.split(" ").slice(-1)}</span><span class="stars">${a?st(a):"☆☆☆☆☆"}</span></div></button>`}).join("");
 const all=Object.values(R).flat();
 $("s1").firstChild.textContent=F.length;
 $("s2").firstChild.textContent=all.length;
 $("s3").firstChild.textContent=all.length?(all.reduce((s,r)=>s+r.n,0)/all.length).toFixed(1):"–";
}
$("grid").onclick=e=>{const b=e.target.closest(".film");if(b)open(+b.dataset.id)};
function open(id){
 cur=F.find(f=>f.id==id);pick=0;
 $("dh").style.background=grad(cur.h);
 $("dt").textContent=cur.t;
 $("dm").textContent=`${cur.y} · ${cur.g} · Dir. ${cur.d} · Crítica ${cur.s.toFixed(1)}/10`;
 $("ds").textContent=cur.x;$("txt").value="";
 stars();revs();$("dlg").showModal();
}
function stars(){$("rate").innerHTML=[1,2,3,4,5].map(i=>`<button data-n="${i}" class="${i<=pick?"on":""}" aria-label="${i} estrelas">★</button>`).join("")}
$("rate").onclick=e=>{const b=e.target.closest("button");if(!b)return;pick=+b.dataset.n;stars()};
function revs(){
 const a=R[cur.id]||[];
 $("revs").innerHTML=a.length?a.slice().reverse().map(r=>`<div class="rev"><b>${esc(r.w)}</b><span class="stars">${st(r.n)}</span><div>${esc(r.t)}</div></div>`).join(""):'<p class="empty">Seja o primeiro a avaliar.</p>';
}
const esc=s=>s.replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
$("send").onclick=()=>{
 if(!pick){alert("Escolha de 1 a 5 estrelas.");return}
 (R[cur.id]=R[cur.id]||[]).push({n:pick,w:$("who").value.trim()||"Anônimo",t:$("txt").value.trim()||"Sem comentário."});
 save();pick=0;$("txt").value="";stars();revs();draw();
};
$("close").onclick=()=>$("dlg").close();
$("dlg").onclick=e=>{if(e.target==$("dlg"))$("dlg").close()};
$("theme").onclick=()=>{const r=document.documentElement;const dark=getComputedStyle(r).getPropertyValue("--bg").trim()=="#0b0b0f";r.setAttribute("data-theme",dark?"light":"dark")};
draw();
