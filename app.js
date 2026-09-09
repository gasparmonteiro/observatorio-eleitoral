const $=s=>document.querySelector(s),fmt=n=>Number(n||0).toLocaleString('pt-BR');
let catalog=null,locais=null,currentCandidate=null,currentDetail=null,currentMunicipio=null,selectedMunicipio=null,chunkCache={},ano='';
let municipioSort={key:null,dir:null},detailView='bairros',localSort={key:null,dir:null};
const eleicaoSel=$('#eleicao'),municipioSel=$('#municipio'),municipioLabel=$('#municipioLabel'),cargoSel=$('#cargo'),candSel=$('#candidato'),busca=$('#busca'),
conteudo=$('#conteudo'),resumo=$('#resumo'),voltar=$('#voltar'),home=$('#home'),
badge=$('#badge'),footer=$('footer'),toolbar=$('#toolbar'),homeIntro=$('#homeIntro');

function setHome(){
  ano=''; catalog=null; locais=null; currentCandidate=null; currentDetail=null; currentMunicipio=null; selectedMunicipio=null;
  municipioSort={key:null,dir:null}; detailView='bairros'; localSort={key:null,dir:null};
  eleicaoSel.value='';
  municipioSel.value=''; municipioSel.disabled=true; municipioLabel.classList.add('hidden'); municipioSel.innerHTML='<option value="">Escolha primeiro a eleição</option>';
  cargoSel.innerHTML='<option value="">Escolha primeiro a eleição</option>'; cargoSel.disabled=true;
  candSel.innerHTML='<option value="">Escolha primeiro o cargo</option>'; candSel.disabled=true;
  busca.value=''; toolbar.classList.add('hidden'); voltar.classList.add('hidden');
  resumo.innerHTML=''; conteudo.innerHTML=''; conteudo.classList.add('hidden');
  homeIntro.classList.remove('hidden'); badge.textContent='Consulta histórica';
  footer.textContent='Observatório Eleitoral MT · Bases históricas do TSE';
}
async function loadYear(y){
  ano=String(y); currentCandidate=null; currentDetail=null; currentMunicipio=null; selectedMunicipio=null;
  municipioSort={key:null,dir:null}; detailView='bairros'; localSort={key:null,dir:null};
  busca.value=''; resumo.innerHTML=''; conteudo.classList.add('hidden'); toolbar.classList.add('hidden');
  voltar.classList.add('hidden'); homeIntro.classList.add('hidden');
  cargoSel.disabled=true; candSel.disabled=true;
  cargoSel.innerHTML='<option value="">Carregando cargos…</option>';
  [catalog,locais]=await Promise.all([
    fetch(`dados/${ano}/catalogo.json`).then(r=>{if(!r.ok)throw new Error('Catálogo não encontrado');return r.json()}),
    fetch(`dados/${ano}/locais.json`).then(r=>{if(!r.ok)throw new Error('Locais não encontrados');return r.json()})
  ]);
  if(catalog.tipo==='municipal'){
    municipioLabel.classList.remove('hidden'); municipioSel.disabled=false;
    municipioSel.innerHTML='<option value="">Escolha o município</option>'+catalog.municipios.map(m=>`<option value="${m.codigo}">${m.nome}</option>`).join('');
    cargoSel.innerHTML='<option value="">Escolha primeiro o município</option>'; cargoSel.disabled=true;
  }else{
    municipioLabel.classList.add('hidden'); municipioSel.disabled=true;
    cargoSel.innerHTML='<option value="">Escolha o cargo</option>'+catalog.cargos.map(c=>`<option value="${c.codigo}">${c.nome}</option>`).join(''); cargoSel.disabled=false;
  }
  candSel.innerHTML='<option value="">Escolha primeiro o cargo</option>';
  const displayAno=catalog.ano||ano, displayTurno=catalog.turno||1; badge.textContent=`${displayAno} · ${displayTurno}º turno`; footer.textContent=`Observatório Eleitoral MT · Base ${displayAno}`;
}
function municipioCatalog(){return catalog?.municipios?.find(m=>String(m.codigo)===String(selectedMunicipio))}
function cargo(){const cs=catalog?.tipo==='municipal'?municipioCatalog()?.cargos:catalog?.cargos;return cs?.find(c=>String(c.codigo)===String(cargoSel.value))}
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
  conteudo.innerHTML=`<div class="list-title"><h2>Candidatos</h2><p>${catalog?.ano||ano}${catalog?.tipo==='municipal'?' · '+(municipioCatalog()?.nome||''):''} · ${c.nome}</p></div>
  <div class="table-head"><div>#</div><div>Candidato</div><div style="text-align:right">Votos</div></div>`+
  arr.map((x,i)=>`<div class="row" data-cid="${x.id}"><div class="rank">${i+1}</div><div><div class="name">${x.nome}</div><div class="sub">${x.numero} · ${x.partido}</div></div><div class="votes">${fmt(x.total)}</div></div>`).join('');
  conteudo.querySelectorAll('[data-cid]').forEach(el=>el.onclick=()=>{candSel.value=el.dataset.cid;loadCandidate(el.dataset.cid)});
}
async function loadCandidate(cid){
  const meta=cargo().candidatos.find(c=>c.id===cid); if(!meta)return;
  currentCandidate=meta; currentMunicipio=null; municipioSort={key:null,dir:null}; busca.value=''; busca.placeholder='Buscar município...';
  voltar.classList.remove('hidden'); voltar.textContent='← Voltar aos candidatos';
  const key=`${ano}/${meta.arquivo}`; let d=chunkCache[key];
  if(!d){conteudo.innerHTML='<div class="loading">Carregando votação…</div>';d=await fetch(`dados/${ano}/${meta.arquivo}`).then(r=>r.json());chunkCache[key]=d}
  currentDetail=d[cid]; if(catalog?.tipo==='municipal')renderMunicipio(selectedMunicipio);else renderMunicipios();
}
function sortIndicator(key,state){return state.key===key?(state.dir==='asc'?' ▲':' ▼'):''}
function toggleSort(state,key,defaultDir='asc'){
  if(state.key===key)state.dir=state.dir==='asc'?'desc':'asc';
  else{state.key=key;state.dir=defaultDir}
}
function renderMunicipios(){
  const q=busca.value.trim().toLocaleUpperCase('pt-BR');
  const arr=currentDetail.m.filter(x=>!q||x[1].toLocaleUpperCase('pt-BR').includes(q)).slice();
  arr.sort((a,b)=>{
    if(municipioSort.key==='municipio'){
      const c=a[1].localeCompare(b[1],'pt-BR',{sensitivity:'base'});
      return municipioSort.dir==='asc'?c:-c;
    }
    const c=Number(a[2]||0)-Number(b[2]||0);
    if(!municipioSort.key)return -c || a[1].localeCompare(b[1],'pt-BR',{sensitivity:'base'});
    const primary=municipioSort.dir==='asc'?c:-c;
    return primary || a[1].localeCompare(b[1],'pt-BR',{sensitivity:'base'});
  });
  voltar.classList.remove('hidden'); voltar.textContent='← Voltar aos candidatos';
  resumo.innerHTML=`<div class="kpi"><small>CANDIDATO</small><strong>${currentCandidate.nome}</strong><div class="sub">${currentCandidate.numero} · ${currentCandidate.partido}</div></div><div class="kpi"><small>TOTAL MT</small><strong>${fmt(currentCandidate.total)}</strong></div><div class="kpi"><small>MUNICÍPIOS COM VOTOS</small><strong>${fmt(currentDetail.m.length)}</strong></div>`;
  conteudo.innerHTML=`<div class="table-head"><div>#</div><button class="sort-head" data-msort="municipio">Município${sortIndicator('municipio',municipioSort)}</button><button class="sort-head right" data-msort="votos">Votos${sortIndicator('votos',municipioSort)}</button></div>`+
  arr.map((m,i)=>`<div class="row" data-mid="${m[0]}"><div class="rank">${i+1}</div><div class="name">${m[1]}</div><div class="votes">${fmt(m[2])}</div></div>`).join('');
  conteudo.querySelectorAll('[data-mid]').forEach(el=>el.onclick=()=>renderMunicipio(el.dataset.mid));
  conteudo.querySelectorAll('[data-msort]').forEach(el=>el.onclick=()=>{toggleSort(municipioSort,el.dataset.msort,el.dataset.msort==='votos'?'desc':'asc');renderMunicipios()});
}
function renderMunicipio(mid){
  const loc=locais[String(mid)],m=currentDetail.m.find(x=>String(x[0])===String(mid)); if(!loc||!m)return;
  currentMunicipio=mid; voltar.classList.remove('hidden'); voltar.textContent=catalog?.tipo==='municipal'?'← Voltar aos candidatos':'← Voltar aos municípios';
  busca.value=''; busca.placeholder='Filtrar bairro, local ou endereço...';
  const voteMap=new Map(currentDetail.s.filter(x=>String(x[0])===String(mid)).map(x=>[`${x[1]}|${x[2]}`,x[3]])),bairros={};
  for(const s of loc.secoes){
    const [zona,secao,localCode,bairro,localName,endereco='',cep='']=s,v=voteMap.get(`${zona}|${secao}`)||0;if(!v)continue;
    const b=bairros[bairro]||(bairros[bairro]={total:0,locais:{}});b.total+=v;
    const lk=`${localCode}|${localName}|${endereco}`,l=b.locais[lk]||(b.locais[lk]={code:localCode,name:localName,endereco,cep,total:0,secoes:[]});
    l.total+=v;l.secoes.push([zona,secao,v]);
  }
  window._bairroData=Object.entries(bairros).sort((a,b)=>b[1].total-a[1].total||a[0].localeCompare(b[0],'pt-BR'));
  window._localData=[];
  for(const [bn,b] of window._bairroData){
    for(const l of Object.values(b.locais))window._localData.push({bairro:bn,...l});
  }
  detailView='bairros'; localSort={key:null,dir:null};
  resumo.innerHTML=`<div class="kpi"><small>MUNICÍPIO</small><strong>${m[1]}</strong><div class="sub">Eleição ${catalog?.ano||ano}</div></div><div class="kpi"><small>VOTOS</small><strong>${fmt(m[2])}</strong><div class="sub">${currentCandidate.nome}</div></div><div class="kpi"><small>BAIRROS COM VOTOS</small><strong>${fmt(window._bairroData.length)}</strong></div>`;
  renderTerritorial();
}
function territorialHeader(){
  return `<div class="detail-title"><h2>Detalhamento territorial</h2><p>${detailView==='bairros'?'Bairro → local de votação + endereço → seção':'Consulta direta por local de votação → seção'}</p></div><div class="detail-tabs"><button class="detail-tab ${detailView==='bairros'?'active':''}" data-view="bairros">🏘️ Bairros</button><button class="detail-tab ${detailView==='locais'?'active':''}" data-view="locais">🏫 Locais de votação</button></div>`;
}
function bindTerritorialTabs(){
  conteudo.querySelectorAll('[data-view]').forEach(x=>x.onclick=()=>{detailView=x.dataset.view;renderTerritorial()});
}
function renderTerritorial(){detailView==='locais'?renderLocais():renderBairros()}
function renderBairros(){
  const q=busca.value.trim().toLocaleUpperCase('pt-BR'),ba=(window._bairroData||[]).filter(([bn,b])=>!q||bn.toLocaleUpperCase('pt-BR').includes(q)||Object.values(b.locais).some(l=>(`${l.name} ${l.endereco}`).toLocaleUpperCase('pt-BR').includes(q)));
  conteudo.innerHTML=territorialHeader()+
  (ba.length?ba.map(([bn,b],bi)=>`<div class="bairro"><button data-b="${bi}"><div><div class="bairro-title">${bn}</div><div class="count">${Object.keys(b.locais).length} local(is)</div></div><div><span class="v">${fmt(b.total)}</span><span class="arrow">▾</span></div></button><div class="nested hidden" id="b${bi}">${Object.values(b.locais).sort((a,z)=>z.total-a.total).map((l,li)=>`<div class="local"><button data-l="${bi}-${li}"><div><div class="name">${l.name}</div>${l.endereco?`<div class="address">📍 ${l.endereco}${l.cep?` · CEP ${l.cep}`:''}</div>`:''}<div class="count">Local ${l.code} · ${l.secoes.length} seção(ões)</div></div><div><span class="v">${fmt(l.total)}</span><span class="arrow">▾</span></div></button><div class="sections hidden" id="l${bi}-${li}">${l.secoes.slice().sort((a,z)=>a[1]-z[1]).map(s=>`<div class="section-row"><div>Zona ${s[0]} · Seção ${s[1]}</div><div class="v">${fmt(s[2])}</div></div>`).join('')}</div></div>`).join('')}</div></div>`).join(''):'<div class="empty">Nenhum resultado encontrado.</div>');
  bindTerritorialTabs();
  conteudo.querySelectorAll('[data-b]').forEach(x=>x.onclick=()=>document.getElementById('b'+x.dataset.b).classList.toggle('hidden'));
  conteudo.querySelectorAll('[data-l]').forEach(x=>x.onclick=()=>document.getElementById('l'+x.dataset.l).classList.toggle('hidden'));
}
function renderLocais(){
  const q=busca.value.trim().toLocaleUpperCase('pt-BR');
  const arr=(window._localData||[]).filter(l=>!q||(`${l.bairro} ${l.name} ${l.endereco}`).toLocaleUpperCase('pt-BR').includes(q)).slice();
  arr.sort((a,b)=>{
    let c=0;
    if(localSort.key==='bairro')c=a.bairro.localeCompare(b.bairro,'pt-BR',{sensitivity:'base'});
    else if(localSort.key==='local')c=a.name.localeCompare(b.name,'pt-BR',{sensitivity:'base'});
    else c=Number(a.total||0)-Number(b.total||0);
    if(!localSort.key)c=-c;
    else if(localSort.dir==='desc')c=-c;
    return c || a.bairro.localeCompare(b.bairro,'pt-BR',{sensitivity:'base'}) || a.name.localeCompare(b.name,'pt-BR',{sensitivity:'base'});
  });
  conteudo.innerHTML=territorialHeader()+`<div class="local-table-head"><button class="sort-head" data-lsort="bairro">Bairro${sortIndicator('bairro',localSort)}</button><button class="sort-head" data-lsort="local">Local de votação${sortIndicator('local',localSort)}</button><button class="sort-head right" data-lsort="votos">Votos${sortIndicator('votos',localSort)}</button></div>`+
  (arr.length?arr.map((l,i)=>`<div class="local-table-item"><button class="local-table-row" data-localrow="${i}"><div>${l.bairro}</div><div><div class="name">${l.name}</div><div class="count">Local ${l.code}</div></div><div class="votes">${fmt(l.total)}</div></button><div class="local-table-detail hidden" id="localrow${i}">${l.endereco?`<div class="address">📍 ${l.endereco}${l.cep?` · CEP ${l.cep}`:''}</div>`:''}<div class="sections">${l.secoes.slice().sort((a,z)=>a[1]-z[1]).map(s=>`<div class="section-row"><div>Zona ${s[0]} · Seção ${s[1]}</div><div class="v">${fmt(s[2])}</div></div>`).join('')}</div></div></div>`).join(''):'<div class="empty">Nenhum resultado encontrado.</div>');
  bindTerritorialTabs();
  conteudo.querySelectorAll('[data-lsort]').forEach(x=>x.onclick=()=>{toggleSort(localSort,x.dataset.lsort,x.dataset.lsort==='votos'?'desc':'asc');renderLocais()});
  conteudo.querySelectorAll('[data-localrow]').forEach(x=>x.onclick=()=>document.getElementById('localrow'+x.dataset.localrow).classList.toggle('hidden'));
}
eleicaoSel.onchange=async()=>{if(!eleicaoSel.value){setHome();return}try{await loadYear(eleicaoSel.value)}catch(e){conteudo.classList.remove('hidden');conteudo.innerHTML='<div class="empty">Não foi possível carregar os dados desta eleição.</div>';console.error(e)}};
municipioSel.onchange=()=>{selectedMunicipio=municipioSel.value;currentCandidate=null;currentDetail=null;currentMunicipio=null;busca.value='';resumo.innerHTML='';toolbar.classList.add('hidden');conteudo.classList.add('hidden');candSel.disabled=true;candSel.innerHTML='<option value="">Escolha primeiro o cargo</option>';if(selectedMunicipio){const m=municipioCatalog();cargoSel.innerHTML='<option value="">Escolha o cargo</option>'+m.cargos.map(c=>`<option value="${c.codigo}">${c.nome}</option>`).join('');cargoSel.disabled=false}else{cargoSel.innerHTML='<option value="">Escolha primeiro o município</option>';cargoSel.disabled=true}};
cargoSel.onchange=()=>{busca.value='';resumo.innerHTML='';if(cargoSel.value)showCandidateList();else{candSel.disabled=true;candSel.innerHTML='<option value="">Escolha primeiro o cargo</option>';toolbar.classList.add('hidden');conteudo.classList.add('hidden')}};
candSel.onchange=()=>{busca.value='';if(candSel.value)loadCandidate(candSel.value);else showCandidateList()};
busca.oninput=()=>currentMunicipio?renderTerritorial():currentCandidate?(catalog?.tipo==='municipal'?renderTerritorial():renderMunicipios()):renderCandidates();
voltar.onclick=()=>{busca.value='';if(currentMunicipio){if(catalog?.tipo==='municipal'){currentMunicipio=null;currentCandidate=null;currentDetail=null;candSel.value='';resumo.innerHTML='';busca.placeholder='Buscar candidato...';renderCandidates();voltar.classList.add('hidden')}else{currentMunicipio=null;busca.placeholder='Buscar município...';renderMunicipios()}}else if(currentCandidate){currentCandidate=null;currentDetail=null;candSel.value='';resumo.innerHTML='';busca.placeholder='Buscar candidato...';renderCandidates();voltar.classList.add('hidden')}};
home.onclick=setHome;
setHome();
