// shared/molecule-modal.js — MolModal engine for kbiology
// Public API: MolModal.open(molData), MolModal.close()
// All DOM creation via createElement — no innerHTML.

(function () {
  'use strict';

  function mk(tag, cls, txt) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined) e.textContent = txt;
    return e;
  }
  function clr(n) { while (n.firstChild) n.removeChild(n.firstChild); }

  function ensureDOM() {
    if (document.getElementById('mol-overlay')) return;
    const ov = mk('div'); ov.id = 'mol-overlay';
    const sh = mk('div'); sh.id = 'mol-shell';
    const hdr= mk('div'); hdr.id= 'mol-hdr';
    const bar= mk('div'); bar.id= 'mol-charge-bar';
    const row= mk('div','mol-hdr-row');
    const ico= mk('div','mol-hdr-icon'); ico.id='mol-icon';
    const meta=mk('div','mol-hdr-meta');
    const nm = mk('div','mol-hdr-name'); nm.id='mol-name';
    const sub= mk('div','mol-hdr-sub');  sub.id='mol-sub';
    const bdg= mk('div','mol-badges');   bdg.id='mol-badges';
    const cls= mk('button','mol-close'); cls.textContent='\u2715'; cls.id='mol-close';
    const vzT= mk('div','mol-viz-tabs'); vzT.id='mol-viz-tabs';
    meta.appendChild(nm); meta.appendChild(sub); meta.appendChild(bdg);
    row.appendChild(ico); row.appendChild(meta); row.appendChild(cls);
    hdr.appendChild(bar); hdr.appendChild(row); hdr.appendChild(vzT);
    const body=mk('div'); body.id='mol-body';
    const foot=mk('div'); foot.id='mol-foot';
    const nihA=mk('a','mol-foot-link','NIH \u2197'); nihA.id='mol-nih'; nihA.target='_blank'; nihA.rel='noopener';
    const s1=mk('span','mol-foot-sep','|');
    const pcA=mk('a','mol-foot-link','PubChem \u2197'); pcA.id='mol-pubchem'; pcA.target='_blank'; pcA.rel='noopener';
    const s2=mk('span','mol-foot-sep','|');
    const pdbA=mk('a','mol-foot-link','PDB \u2197'); pdbA.id='mol-pdb'; pdbA.target='_blank'; pdbA.rel='noopener';
    const src=mk('span','mol-foot-source','Data: local NIH cache \u00b7 fetch_data.py');
    foot.appendChild(nihA); foot.appendChild(s1); foot.appendChild(pcA);
    foot.appendChild(s2); foot.appendChild(pdbA); foot.appendChild(src);
    sh.appendChild(hdr); sh.appendChild(body); sh.appendChild(foot);
    ov.appendChild(sh); document.body.appendChild(ov);
    cls.addEventListener('click', MolModal.close);
    ov.addEventListener('click', function(e){ if(e.target===ov) MolModal.close(); });
    document.addEventListener('keydown', function(e){ if(e.key==='Escape') MolModal.close(); });
  }

  // ── Canvas renderers ──────────────────────────────────────────────────────
  function drawStructure(cv, mol) {
    const ctx=cv.getContext('2d'), W=cv.width, H=cv.height, c=mol.color||'#00e5ff';
    ctx.fillStyle='#07071e'; ctx.fillRect(0,0,W,H);
    if (!mol.is_protein) {
      const cx=W*.45, cy=H/2, r=Math.min(W,H)*.28;
      ctx.strokeStyle=c; ctx.lineWidth=2;
      ctx.beginPath();
      for(let i=0;i<6;i++){const a=Math.PI/3*i-Math.PI/6;i===0?ctx.moveTo(cx+r*Math.cos(a),cy+r*Math.sin(a)):ctx.lineTo(cx+r*Math.cos(a),cy+r*Math.sin(a));}
      ctx.closePath(); ctx.stroke();
      for(let i=0;i<6;i++){
        const a=Math.PI/3*i-Math.PI/6;
        ctx.beginPath();ctx.moveTo(cx+r*Math.cos(a),cy+r*Math.sin(a));ctx.lineTo(cx+(r+22)*Math.cos(a),cy+(r+22)*Math.sin(a));ctx.stroke();
        ctx.beginPath();ctx.arc(cx+(r+22)*Math.cos(a),cy+(r+22)*Math.sin(a),4,0,Math.PI*2);ctx.fillStyle=c+'bb';ctx.fill();
      }
    } else {
      ctx.strokeStyle=c+'88'; ctx.lineWidth=2;
      for(let h=0;h<3;h++){const ox=60+h*100;ctx.beginPath();for(let t=0;t<Math.PI*3.5;t+=0.12){const x=ox+18*Math.cos(t),y=30+t*18;t===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.stroke();}
      ctx.strokeStyle=c; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(30,H-25); ctx.lineTo(W-30,H-25); ctx.stroke();
    }
    ctx.fillStyle=c+'99'; ctx.font='bold 10px monospace'; ctx.textAlign='center';
    ctx.fillText(mol.type||'molecule', W/2, H-8);
  }

  function drawInteraction(cv, map) {
    const ctx=cv.getContext('2d'), W=cv.width, H=cv.height;
    ctx.fillStyle='#07071e'; ctx.fillRect(0,0,W,H);
    const ns={}, sx=W/500, sy=H/320;
    (map.nodes||[]).forEach(n=>{ ns[n.id]=n; });
    (map.edges||[]).forEach(e=>{
      const a=ns[e.from], b=ns[e.to]; if(!a||!b) return;
      ctx.strokeStyle=e.color||'#555577'; ctx.lineWidth=e.dashed?1.5:2.5;
      ctx.setLineDash(e.dashed?[5,4]:[]); ctx.beginPath();
      ctx.moveTo(a.x*sx,a.y*sy); ctx.lineTo(b.x*sx,b.y*sy); ctx.stroke(); ctx.setLineDash([]);
      if(e.label){const mx=(a.x+b.x)/2*sx,my=(a.y+b.y)/2*sy; ctx.fillStyle=(e.color||'#555577')+'cc'; ctx.font='9px monospace'; ctx.textAlign='center'; e.label.split('\n').forEach((ln,i,arr)=>ctx.fillText(ln,mx,my+(i-arr.length/2+.5)*12));}
    });
    (map.nodes||[]).forEach(n=>{
      const x=n.x*sx,y=n.y*sy,r=(n.r||28)*Math.min(sx,sy);
      ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2); ctx.fillStyle=n.color+'22';ctx.fill(); ctx.strokeStyle=n.color;ctx.lineWidth=2;ctx.stroke();
      ctx.fillStyle=n.color; ctx.font='bold 10px sans-serif'; ctx.textAlign='center';
      (n.label||'').split('\n').forEach((ln,i,arr)=>ctx.fillText(ln,x,y+(i-arr.length/2+.5)*13));
      if(n.sub){ctx.fillStyle=n.color+'88';ctx.font='8px sans-serif';ctx.fillText(n.sub,x,y+r+11);}
    });
  }

  function drawDomainBar(cv, domains) {
    const ctx=cv.getContext('2d'), W=cv.width, H=cv.height;
    ctx.fillStyle='#07071e'; ctx.fillRect(0,0,W,H);
    if(!domains||!domains.length) return;
    const bX=30,bY=H/2-12,bW=W-60,bH=22,seg=(bW-domains.length*2)/domains.length;
    domains.forEach((d,i)=>{
      const x=bX+i*(seg+2);
      ctx.fillStyle=d.color+'cc'; ctx.fillRect(x,bY,seg,bH);
      ctx.strokeStyle=d.color; ctx.lineWidth=1.5; ctx.strokeRect(x,bY,seg,bH);
      ctx.fillStyle=d.color; ctx.font='8px monospace'; ctx.textAlign='center';
      ctx.fillText((d.name||'').split(' ')[0],x+seg/2,bY+bH+13);
    });
    ctx.fillStyle='#33335a'; ctx.font='9px monospace'; ctx.textAlign='left'; ctx.fillText('N',bX-12,bY+bH/2+3);
    ctx.textAlign='right'; ctx.fillText('C',bX+bW+12,bY+bH/2+3);
  }

  // ── Panel builders ──────────────────────────────────────────────────────
  function buildStructurePanel(mol) {
    const wrap=mk('div','mol-panel active'); wrap.style.gridTemplateColumns='1fr 1fr';
    const left=mk('div'); left.style.cssText='display:flex;flex-direction:column;gap:8px';
    const cw=mk('div','mol-canvas-wrap'); cw.style.minHeight='200px';
    const cv=mk('canvas'); cv.width=300; cv.height=190;
    const lbl=mk('div','mol-canvas-lbl'); lbl.textContent=(mol.is_protein?'Protein ribbon · PDB '+(mol.pdb_id||''):'2D structure · CID '+(mol.pubchem_cid||''));
    cw.appendChild(cv); cw.appendChild(lbl); drawStructure(cv,mol);
    const mech=mk('div','mol-prop-sect');
    mech.appendChild(mk('div','mol-prop-title','Function & Mechanism'));
    mech.appendChild(mk('div','mol-mech',mol.mechanism||''));
    left.appendChild(cw); left.appendChild(mech);
    const right=mk('div'); right.style.cssText='display:flex;flex-direction:column;gap:8px';
    const ps=mk('div','mol-prop-sect');
    ps.appendChild(mk('div','mol-prop-title','Physicochemical Properties'));
    Object.entries(mol.properties||{}).forEach(([k,v])=>{
      const row=mk('div','prop-row');
      const keySpan=mk('span','prop-key');
      // Add glossary tooltip to property labels if term exists in GLOSS
      const glossKey = k.toLowerCase().replace(/\s*\(.*\)/, '').trim();
      if(window.GLOSS && window.GLOSS[glossKey]) {
        keySpan.className='prop-key gtip'; keySpan.dataset.gloss=glossKey;
      }
      keySpan.textContent=k;
      const valSpan=mk('span','prop-val '+((mol.property_flags||{})[k]||''),v);
      row.appendChild(keySpan); row.appendChild(valSpan); ps.appendChild(row);
    });
    right.appendChild(ps);
    wrap.appendChild(left); wrap.appendChild(right);
    return wrap;
  }

  function buildInteractionPanel(mol) {
    const wrap=mk('div','mol-panel active'); wrap.style.cssText='display:flex;flex-direction:column;gap:10px';
    const iw=mk('div','mol-interaction-wrap'); iw.style.minHeight='280px';
    const cv=mk('canvas'); cv.width=520; cv.height=280;
    const lbl=mk('div','mol-canvas-lbl'); lbl.textContent=(mol.interaction||{}).title||'Interaction map';
    iw.appendChild(cv); iw.appendChild(lbl);
    if(mol.interaction) drawInteraction(cv,mol.interaction);
    wrap.appendChild(iw);
    const leg=mk('div','mol-legend');
    [{color:mol.color,label:'This molecule'},{color:'#8888b0',label:'Partner'},{color:'#00ff99',label:'Activation'},{color:'#ff4444',label:'Inhibition'}].forEach(it=>{
      const li=mk('div','mol-leg-item'); const dot=mk('div','mol-leg-dot'); dot.style.background=it.color;
      li.appendChild(dot); li.appendChild(mk('span','',it.label)); leg.appendChild(li);
    });
    wrap.appendChild(leg);
    return wrap;
  }

  function buildPapersPanel(mol) {
    const wrap=mk('div','mol-panel active'); wrap.style.display='block';
    (mol.papers||[]).forEach(p=>{
      const item=mk('div','mol-paper-item');
      const meta=mk('div','mol-paper-meta');
      meta.appendChild(mk('span','mol-paper-year',p.year));
      meta.appendChild(mk('span','mol-paper-jrnl',p.journal));
      if(p.impact) meta.appendChild(mk('span','mol-paper-if',p.impact));
      item.appendChild(meta);
      item.appendChild(mk('div','mol-paper-title',p.title));
      item.appendChild(mk('div','mol-paper-abs',p.abstract));
      wrap.appendChild(item);
    });
    if(!(mol.papers||[]).length) wrap.appendChild(mk('div','mol-mech','No papers loaded for this molecule.'));
    return wrap;
  }

  function buildRelMolsPanel(mol) {
    const wrap=mk('div','mol-panel active'); wrap.style.gridTemplateColumns='repeat(3,1fr)';
    (mol.rel_molecules||[]).forEach(m=>{
      const card=mk('div','mol-rel-card');
      card.appendChild(mk('div','mol-rel-icon',m.icon||''));
      card.appendChild(mk('div','mol-rel-name',m.name));
      card.appendChild(mk('div','mol-rel-role',m.role));
      card.appendChild(mk('div','mol-rel-id',m.id||''));
      wrap.appendChild(card);
    });
    if(!(mol.rel_molecules||[]).length) wrap.appendChild(mk('div','mol-mech','No related molecules listed.'));
    return wrap;
  }

  function buildDomainPanel(mol) {
    const wrap=mk('div','mol-panel active'); wrap.style.gridTemplateColumns='1fr 260px';
    const rw=mk('div','mol-interaction-wrap'); rw.style.minHeight='240px';
    const cv=mk('canvas'); cv.width=400; cv.height=240;
    const lbl=mk('div','mol-canvas-lbl'); lbl.textContent='Domain architecture';
    rw.appendChild(cv); rw.appendChild(lbl); drawDomainBar(cv,mol.domains);
    const dm=mk('div','mol-domain-map');
    dm.appendChild(mk('div','sec-lbl','Functional Domains'));
    (mol.domains||[]).forEach(d=>{
      const row=mk('div','mol-domain-row');
      const seg=mk('div','mol-domain-seg'); seg.style.background=d.color;
      const info=mk('div'); info.style.flex='1';
      info.appendChild(mk('div','mol-domain-name',d.name));
      info.appendChild(mk('div','mol-domain-pos','aa '+(d.pos||'')));
      info.appendChild(mk('div','mol-domain-fn',d.fn||''));
      row.appendChild(seg); row.appendChild(info); dm.appendChild(row);
    });
    wrap.appendChild(rw); wrap.appendChild(dm);
    return wrap;
  }

  const TABS = [
    {id:'structure',   label:'Structure + Properties', build:buildStructurePanel},
    {id:'interaction', label:'Interaction Map',         build:buildInteractionPanel},
    {id:'papers',      label:'Key Papers',              build:buildPapersPanel},
    {id:'rel_mols',    label:'Related Molecules',       build:buildRelMolsPanel},
    {id:'domains',     label:'Domain Map',              build:buildDomainPanel, proteinsOnly:true},
  ];

  window.MolModal = {
    open: function(mol) {
      ensureDOM();
      const shell=document.getElementById('mol-shell');
      shell.style.setProperty('--mol-color', mol.color||'#00e5ff');
      const ico=document.getElementById('mol-icon');
      ico.textContent=mol.icon||''; ico.style.background=(mol.color||'#00e5ff')+'18'; ico.style.borderColor=(mol.color||'#00e5ff')+'44';
      document.getElementById('mol-name').textContent=mol.name||'';
      document.getElementById('mol-sub').textContent=mol.sub||'';
      const bdg=document.getElementById('mol-badges'); clr(bdg);
      (mol.badges||[]).forEach(function(b){ const s=mk('span','mol-badge',b.text); s.style.color=b.color; s.style.borderColor=b.color+'44'; s.style.background=b.color+'10'; bdg.appendChild(s); });
      // Restart charge bar animation
      const bar=document.getElementById('mol-charge-bar');
      bar.style.background='linear-gradient(90deg,'+(mol.color||'#00e5ff')+' 0%,#fff 50%,'+(mol.color||'#00e5ff')+' 100%)';
      bar.style.boxShadow='0 0 14px '+(mol.color||'#00e5ff')+',0 0 28px rgba(255,255,255,.35)';
      bar.style.animation='none'; void bar.offsetWidth; bar.style.animation='molcharge .8s ease forwards';
      // Build viz tabs
      const vzT=document.getElementById('mol-viz-tabs'); clr(vzT);
      const activeTabs=TABS.filter(function(t){ return !t.proteinsOnly||mol.is_protein; });
      activeTabs.forEach(function(t,i){
        const btn=mk('div','mol-viz-tab'+(i===0?' active':''),t.label);
        btn.addEventListener('click',function(){
          document.querySelectorAll('.mol-viz-tab').forEach(function(b){ b.classList.remove('active'); });
          btn.classList.add('active');
          const body=document.getElementById('mol-body'); clr(body); body.appendChild(t.build(mol));
        });
        vzT.appendChild(btn);
      });
      const body=document.getElementById('mol-body'); clr(body); body.appendChild(activeTabs[0].build(mol));
      document.getElementById('mol-nih').href    =mol.nih_link||'#';
      document.getElementById('mol-pubchem').href=mol.pubchem_link||(mol.pubchem_cid?'https://pubchem.ncbi.nlm.nih.gov/compound/'+mol.pubchem_cid:'#');
      document.getElementById('mol-pdb').href    =mol.pdb_link||(mol.pdb_id?'https://www.rcsb.org/structure/'+mol.pdb_id:'#');
      document.getElementById('mol-overlay').classList.add('open');
    },
    close: function() { const ov=document.getElementById('mol-overlay'); if(ov) ov.classList.remove('open'); }
  };
})();
