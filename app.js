const $=s=>document.querySelector(s),fmt=n=>Number(n||0).toLocaleString('pt-BR');
let catalog=null,locais=null,currentCandidate=null,currentDetail=null,currentMunicipio=null,chunkCache={},ano='';
const eleicaoSel=$('#eleicao'),cargoSel=$('#cargo'),candSel=$('#candidato'),busca=$('#busca'),
conteudo=$('#conteudo'),resumo=$('#resumo'),voltar=$('#voltar'),home=$('#home'),
badge=$('#badge'),footer=$('footer'),toolbar=$('#toolbar'),homeIntro=$('#homeIntro');

function setHome(){
  ano=''; catalog=null; locais=null; currentCandidate=null; currentDetail=null; currentMunicipio=null;
  eleicaoSel.value='';
  cargoSel.innerHTML='<option value="">Escolha primeiro a eleição</option>'; cargoSel.disabled=true;
  candSel.innerHTML='<option value="">Escolha primeiro o cargo</option>'; candSel.disabled=true;
  busca.value=''; toolbar.classList.add('hidden'); voltar.classList.add('hidden');
  resumo.innerHTML=''; conteudo.innerHTML=''; conteudo.classList.add('hidden');
  homeIntro.classList.remove('hidden'); badge.textContent='Consulta histórica';
  footer.textContent='Observatório Eleitoral MT · Bases históricas do TSE';
}
async function loadYear(y){
  ano=String(y); currentCandidate=null; currentDetail=null; currentMunicipio=null;
  busca.value=''; resumo.innerHTML=''; conteudo.classList.add('hidden'); toolbar.classList.add('hidden');
  voltar.classList.add('hidden'); homeIntro.classList.add('hidden');
  cargoSel.disabled=true; candSel.disabled=true;
  cargoSel.innerHTML='<option value="">Carregando cargos…</option>';
  [catalog,locais]=await Promise.all([
    fetch(`dados/${ano}/catalogo.json`).then(r=>{if(!r.ok)throw new Error('Catálogo não encontrado');return r.json()}),
    fetch(`dados/${ano}/locais.json`).then(r=>{if(!r.ok)throw new Error('Locais não encontrados');return r.json()})
  ]);
  cargoSel.innerHTML='<option value="">Escolha o cargo</option>'+catalog.cargos.map(c=>`<option value="${c.codigo}">${c.nome}</option>`).join('');
  cargoSel.disabled=false;
  candSel.innerHTML='<option value="">Escolha primeiro o cargo</option>';
  badge.textContent=`${ano} · 1º turno`; footer.textContent=`Observatório Eleitoral MT · Base ${ano}`;
}
function cargo(){return catalog?.cargos.find(c=>String(c.codigo)===String(cargoSel.value))}
function showCandidateList(){
  const c=cargo(); if(!c)return;
  candSel.disabled=false;
  candSel.innerHTML='<option value="">Todos os candidatos</option>'+c.candidatos.map(x=>`<option value="${x.id}">${x.nome} · ${x.partido}</option>`).join('');
  currentCandidate=null; currentDetail=null; currentMunicipio=null; busca.value='';
  busca.placeholder='Buscar candidato...'; toolbar.classList.remove('hidden'); voltar.classList.add('hidden');
  resumo.innerHTML=''; conteudo.classList.remove('hidden'); renderCandidates();
}
function renderCandidates(){
  const c=cargo(); if(!c)return;
  const q=busca.value.trim().toLocaleUpperCase('pt-BR');
  const arr=c.candidatos.filter(x=>!q||(`${x.nome} ${x.numero} ${x.partido}`).toLocaleUpperCase('pt-BR').includes(q));
  conteudo.innerHTML=`<div class="list-title"><h2>Candidatos</h2><p>${ano} · ${c.nome}</p></div>
  <div class="table-head"><div>#</div><div>Candidato</div><div style="text-align:right">Votos</div></div>`+
  arr.map((x,i)=>`<div class="row" data-cid="${x.id}"><div class="rank">${i+1}</div><div><div class="name">${x.nome}</div><div class="sub">${x.numero} · ${x.partido}</div></div><div class="votes">${fmt(x.total)}</div></div>`).join('');
  conteudo.querySelectorAll('[data-cid]').forEach(el=>el.onclick=()=>{candSel.value=el.dataset.cid;loadCandidate(el.dataset.cid)});
}
async function loadCandidate(cid){
  const meta=cargo().candidatos.find(c=>c.id===cid); if(!meta)return;
  currentCandidate=meta; currentMunicipio=null; busca.value=''; busca.placeholder='Buscar município...';
  voltar.classList.remove('hidden'); voltar.textContent='← Voltar aos candidatos';
  const key=`${ano}/${meta.arquivo}`; let d=chunkCache[key];
  if(!d){conteudo.innerHTML='<div class="loading">Carregando votação…</div>';d=await fetch(`dados/${ano}/${meta.arquivo}`).then(r=>r.json());chunkCache[key]=d}
  currentDetail=d[cid]; renderMunicipios();
}
function renderMunicipios(){
  const q=busca.value.trim().toLocaleUpperCase('pt-BR'),arr=currentDetail.m.filter(x=>!q||x[1].toLocaleUpperCase('pt-BR').includes(q));
  voltar.classList.remove('hidden'); voltar.textContent='← Voltar aos candidatos';
  resumo.innerHTML=`<div class="kpi"><small>CANDIDATO</small><strong>${currentCandidate.nome}</strong><div class="sub">${currentCandidate.numero} · ${currentCandidate.partido}</div></div><div class="kpi"><small>TOTAL MT</small><strong>${fmt(currentCandidate.total)}</strong></div><div class="kpi"><small>MUNICÍPIOS COM VOTOS</small><strong>${fmt(currentDetail.m.length)}</strong></div>`;
  conteudo.innerHTML=`<div class="table-head"><div>#</div><div>Município</div><div style="text-align:right">Votos</div></div>`+
  arr.map((m,i)=>`<div class="row" data-mid="${m[0]}"><div class="rank">${i+1}</div><div class="name">${m[1]}</div><div class="votes">${fmt(m[2])}</div></div>`).join('');
  conteudo.querySelectorAll('[data-mid]').forEach(el=>el.onclick=()=>renderMunicipio(el.dataset.mid));
}
function renderMunicipio(mid){
  const loc=locais[String(mid)],m=currentDetail.m.find(x=>String(x[0])===String(mid)); if(!loc||!m)return;
  currentMunicipio=mid; voltar.classList.remove('hidden'); voltar.textContent='← Voltar aos municípios';
  busca.value=''; busca.placeholder='Filtrar bairro, local ou endereço...';
  const voteMap=new Map(currentDetail.s.filter(x=>String(x[0])===String(mid)).map(x=>[`${x[1]}|${x[2]}`,x[3]])),bairros={};
  for(const s of loc.secoes){
    const [zona,secao,localCode,bairro,localName,endereco='',cep='']=s,v=voteMap.get(`${zona}|${secao}`)||0;if(!v)continue;
    const b=bairros[bairro]||(bairros[bairro]={total:0,locais:{}});b.total+=v;
    const lk=`${localCode}|${localName}|${endereco}`,l=b.locais[lk]||(b.locais[lk]={code:localCode,name:localName,endereco,cep,total:0,secoes:[]});
    l.total+=v;l.secoes.push([zona,secao,v]);
  }
  window._bairroData=Object.entries(bairros).sort((a,b)=>b[1].total-a[1].total||a[0].localeCompare(b[0],'pt-BR'));
  resumo.innerHTML=`<div class="kpi"><small>MUNICÍPIO</small><strong>${m[1]}</strong><div class="sub">Eleição ${ano}</div></div><div class="kpi"><small>VOTOS</small><strong>${fmt(m[2])}</strong><div class="sub">${currentCandidate.nome}</div></div><div class="kpi"><small>BAIRROS COM VOTOS</small><strong>${fmt(window._bairroData.length)}</strong></div>`;
  renderBairros();
}
function renderBairros(){
  const q=busca.value.trim().toLocaleUpperCase('pt-BR'),ba=(window._bairroData||[]).filter(([bn,b])=>!q||bn.toLocaleUpperCase('pt-BR').includes(q)||Object.values(b.locais).some(l=>(`${l.name} ${l.endereco}`).toLocaleUpperCase('pt-BR').includes(q)));
  conteudo.innerHTML=`<div class="detail-title"><h2>Detalhamento territorial</h2><p>Bairro → local de votação + endereço → seção</p></div>`+
  (ba.length?ba.map(([bn,b],bi)=>`<div class="bairro"><button data-b="${bi}"><div><div class="bairro-title">${bn}</div><div class="count">${Object.keys(b.locais).length} local(is)</div></div><div><span class="v">${fmt(b.total)}</span><span class="arrow">▾</span></div></button><div class="nested hidden" id="b${bi}">${Object.values(b.locais).sort((a,z)=>z.total-a.total).map((l,li)=>`<div class="local"><button data-l="${bi}-${li}"><div><div class="name">${l.name}</div>${l.endereco?`<div class="address">📍 ${l.endereco}${l.cep?` · CEP ${l.cep}`:''}</div>`:''}<div class="count">Local ${l.code} · ${l.secoes.length} seção(ões)</div></div><div><span class="v">${fmt(l.total)}</span><span class="arrow">▾</span></div></button><div class="sections hidden" id="l${bi}-${li}">${l.secoes.sort((a,z)=>a[1]-z[1]).map(s=>`<div class="section-row"><div>Zona ${s[0]} · Seção ${s[1]}</div><div class="v">${fmt(s[2])}</div></div>`).join('')}</div></div>`).join('')}</div></div>`).join(''):'<div class="empty">Nenhum resultado encontrado.</div>');
  conteudo.querySelectorAll('[data-b]').forEach(x=>x.onclick=()=>document.getElementById('b'+x.dataset.b).classList.toggle('hidden'));
  conteudo.querySelectorAll('[data-l]').forEach(x=>x.onclick=()=>document.getElementById('l'+x.dataset.l).classList.toggle('hidden'));
}
eleicaoSel.onchange=async()=>{if(!eleicaoSel.value){setHome();return}try{await loadYear(eleicaoSel.value)}catch(e){conteudo.classList.remove('hidden');conteudo.innerHTML='<div class="empty">Não foi possível carregar os dados desta eleição.</div>';console.error(e)}};
cargoSel.onchange=()=>{busca.value='';resumo.innerHTML='';if(cargoSel.value)showCandidateList();else{candSel.disabled=true;candSel.innerHTML='<option value="">Escolha primeiro o cargo</option>';toolbar.classList.add('hidden');conteudo.classList.add('hidden')}};
candSel.onchange=()=>{busca.value='';if(candSel.value)loadCandidate(candSel.value);else showCandidateList()};
busca.oninput=()=>currentMunicipio?renderBairros():currentCandidate?renderMunicipios():renderCandidates();
voltar.onclick=()=>{busca.value='';if(currentMunicipio){currentMunicipio=null;busca.placeholder='Buscar município...';renderMunicipios()}else if(currentCandidate){currentCandidate=null;currentDetail=null;candSel.value='';resumo.innerHTML='';busca.placeholder='Buscar candidato...';renderCandidates();voltar.classList.add('hidden')}};
home.onclick=setHome;
setHome();
