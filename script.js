 /* -------------------------------------------------------
   * UTIL
   * -----------------------------------------------------*/
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));

  /* -------------------------------------------------------
   * CANVAS: DIGIT FIELD (3D-ish particle cloud of numbers)
   * -----------------------------------------------------*/
  (function DigitField(){
    const c=document.getElementById('digits');
    const ctx=c.getContext('2d');
    let W,H, DPR = Math.min(2, window.devicePixelRatio||1);
    let mx=0,my=0, rx=0, ry=0; // mouse, rotation

    const NUM=360; // particles
    const particles=[];
    const digits = '0123456789';

    function resize(){
      W=window.innerWidth; H=window.innerHeight; c.width=W*DPR; c.height=H*DPR; c.style.width=W+'px'; c.style.height=H+'px'; ctx.setTransform(DPR,0,0,DPR,0,0);
    }
    window.addEventListener('resize', resize,{passive:true}); resize();

    function spawn(){
      particles.length=0;
      for(let i=0;i<NUM;i++){
        particles.push({
          x:(Math.random()*2-1)*1.6, // world coords [-1.6,1.6]
          y:(Math.random()*2-1)*1.0,
          z:Math.random()*2-1, // depth [-1,1]
          ch:digits[(Math.random()*digits.length)|0],
          s:Math.random()*0.9+0.6,
          spd:Math.random()*0.002+0.001,
        });
      }
    }
    spawn();

    // mouse rotation target
    window.addEventListener('mousemove', (e)=>{
      mx = (e.clientX/W - .5)*2; // [-1,1]
      my = (e.clientY/H - .5)*2;
    },{passive:true});

    function project(p){
      // Apply basic Y & X rotation from mouse
      const sinY = Math.sin(ry), cosY = Math.cos(ry);
      const sinX = Math.sin(rx), cosX = Math.cos(rx);
      let x = p.x*cosY - p.z*sinY;
      let z = p.x*sinY + p.z*cosY;
      let y = p.y*cosX - z*sinX;
      z = p.y*sinX + z*cosX;

      const depth = 2.5; // camera distance
      const scale = depth/(depth - z);
      const sx = (x*scale * W/2) + W/2;
      const sy = (y*scale * H/2) + H/2;
      const alpha = clamp((scale-0.5)/1.8, 0, 1);
      return {sx, sy, scale, alpha};
    }

    function tick(t){
      requestAnimationFrame(tick);
      // ease rotation towards mouse
      rx += (my*0.6 - rx)*0.06;
      ry += (mx*0.8 - ry)*0.06;

      ctx.clearRect(0,0,W,H);

      // slow drift
      for(const p of particles){ p.z += p.spd; if(p.z>1.2){ p.z=-1.0; p.x=(Math.random()*2-1)*1.6; p.y=(Math.random()*2-1)*1.0; } }
      particles.sort((a,b)=> (a.z-b.z));

      ctx.save();
      ctx.font = '900 18px system-ui, Segoe UI, Roboto, Inter, Arial';
      ctx.textAlign='center'; ctx.textBaseline='middle';

      for(const p of particles){
        const {sx,sy,scale,alpha}=project(p);
        ctx.globalAlpha = alpha*0.9 + 0.1;
        ctx.shadowBlur = 24*scale; ctx.shadowColor = 'rgba(139,92,246,0.55)';
        ctx.fillStyle = `rgba(210,200,255,${0.85})`;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.scale(scale*p.s, scale*p.s);
        ctx.fillText(p.ch, 0, 0);
        ctx.restore();
      }
      ctx.restore();
    }
    requestAnimationFrame(tick);
  })();

  /* Shards animation removed as requested */

  /* -------------------------------------------------------
   * INTRO OVERLAY SEQUENCE (triggered by Login)
   * -----------------------------------------------------*/
  (function Intro(){
    const $ = sel => document.querySelector(sel);
    const overlay = $('#introOverlay');
    const hi = $('#hiText');
    const ask = $('#askText');
    const form = $('#formWrap');
    const btn = document.getElementById('loginBtn');
    const submit = document.getElementById('submitNick');
    const nick = document.getElementById('nick');
    const titleText = document.getElementById('titleText');
    const titleLabel = document.getElementById('titleLabel');
    let userName = 'Guest';

    function sequence(){
      overlay.classList.add('show');
      hi.classList.add('show');
      // like first Windows boot: black, then Hi.
      setTimeout(()=>{ hi.classList.remove('show'); }, 1400);
      setTimeout(()=>{ ask.classList.add('show'); }, 1900);
      setTimeout(()=>{ ask.style.transform='translateY(-64px)'; }, 3200);
      setTimeout(()=>{ form.classList.add('show'); nick.focus(); }, 3400);
    }

    btn.addEventListener('click', sequence);

    function resizeTitleToFit(){
      // Adjust SVG title text size for longer names
      const svg = document.getElementById('title');
      if(!svg || !titleText) return;
      const vb = svg.viewBox.baseVal; // 0 0 1200 360
      const maxW = vb.width * 0.86; // some padding
      // Start from base size and shrink until fit
      let size = 200; // base font-size
      titleText.setAttribute('font-size', String(size));
      // Rough measure using getBBox (may return 0 if not in DOM yet)
      let bb = titleText.getBBox();
      let safety=20;
  while(bb.width > maxW && size>60 && (safety--)>0){
        size -= 6;
        titleText.setAttribute('font-size', String(size));
        bb = titleText.getBBox();
      }
    }

    function finish(){
      const val = (nick.value||'Guest').trim();
      // Immediately hide the prompt to avoid duplicate text/flicker
      ask.classList.remove('show');
      // disable submit to prevent double-trigger
      submit.disabled = true;
      // Optionally set a quick farewell/greeting but keep it hidden
      ask.textContent = `Welcome, ${val}`;
      userName = val || 'Guest';
      try{ window.userName = userName; }catch{}
      // update main title to nickname
      if(titleText){ titleText.textContent = val || 'OniAI'; }
      if(titleLabel){ titleLabel.textContent = (val || 'OniAI') + ' Title'; }
      resizeTitleToFit();
      // brief pause to show greeting (kept short)
      setTimeout(()=>{ 
        overlay.classList.add('hiding');
      }, 300);
      overlay.addEventListener('animationend', (e)=>{
        if(e.animationName!== 'fadeOutBlur') return;
        overlay.classList.remove('show','hiding');
        // reset for next open
        ask.textContent = 'Enter your nickname';
        ask.style.transform = '';
        hi.classList.remove('show');
        ask.classList.remove('show');
        form.classList.remove('show');
        submit.disabled = false;
      }, { once:true });
      // Also reset input
      nick.value='';
    }
    submit.addEventListener('click', finish);
    nick.addEventListener('keydown', (e)=>{ if(e.key==='Enter') finish(); });
  })();

  /* -------------------------------------------------------
   * CHAT: panel reveal & simple local AI
   * -----------------------------------------------------*/
  (function Chat(){
    const $ = s=>document.querySelector(s);
    const titleWrap = document.querySelector('.title-wrap');
    const mini = document.querySelector('.chat-wrap');
    const chatShell = $('#chatShell');
    const chatPanel = $('#chatPanel');
    const chatBody = $('#chatBody');
    const chatSub = $('#chatSub');
  const miniInput = $('#chatInput');
    const miniSend = $('#chatSend');
    const mainInput = $('#chatMainInput');
    const mainSend = $('#chatMainSend');
  const chatNew = document.getElementById('chatNew');
    const historyList = document.getElementById('historyList');

    // Pull nickname if already defined by Intro closure
    let nameRef = 'Guest';
    try{ nameRef = window.userName || 'Guest'; }catch{ nameRef='Guest'; }

    function setSub(){ chatSub.textContent = `You: ${nameRef} • AI: OniAI`; }
    setSub();

    // Basic localStorage-backed history
    const storeKey = 'oni_chats_v1';
    let chats = [];
    let activeId = null;
    function loadChats(){
      try{ chats = JSON.parse(localStorage.getItem(storeKey)||'[]'); }catch{ chats=[]; }
      if(!Array.isArray(chats)) chats=[];
    }
    function saveChats(){ try{ localStorage.setItem(storeKey, JSON.stringify(chats)); }catch{}
    }
    function genId(){ return 'c_' + Math.random().toString(36).slice(2,10); }
    function titleFromSeed(t){
      const s=(t||'').trim(); if(!s) return 'New chat';
      return (s.length>28? s.slice(0,28)+'…' : s);
    }
    function renderHistory(){
      if(!historyList) return;
      historyList.innerHTML='';
      for(const chat of chats){
        const item = document.createElement('div');
        item.className = 'history-item' + (chat.id===activeId? ' active':'');
        item.setAttribute('role','option');
        item.dataset.id = chat.id;
        // Title span to allow ellipsis
        const title = document.createElement('div');
        title.className = 'history-title';
        title.textContent = chat.title || 'New chat';
        // Delete button
        const del = document.createElement('button');
        del.className = 'history-del';
        del.setAttribute('aria-label','Delete chat');
        del.textContent = '×';
        del.addEventListener('click', (e)=>{
          e.stopPropagation();
          deleteChat(chat.id);
        });
        item.addEventListener('click', ()=> selectChat(chat.id));
        item.appendChild(title);
        item.appendChild(del);
        historyList.appendChild(item);
      }
    }
    function ensureActive(){
      if(!activeId){
        const id = genId();
        chats.unshift({ id, title:'New chat', messages:[] });
        activeId = id; saveChats(); renderHistory();
      }
    }
    function selectChat(id){
      activeId = id; renderHistory();
      // render messages
      chatBody.innerHTML='';
      const chat = chats.find(c=>c.id===id); if(!chat) return;
      for(const m of chat.messages){ appendBubble(m.text, m.role); }
      mainInput.focus();
    }
    function addMessageToActive(text, role){
      const chat = chats.find(c=>c.id===activeId); if(!chat) return;
      chat.messages.push({ role, text, t: Date.now() });
      // Set title from first user message
      if(!chat.title || chat.title==='New chat'){
        if(role==='user' && text.trim()){
          chat.title = titleFromSeed(text);
        }
      }
      saveChats(); renderHistory();
    }
    function deleteChat(id){
      const idx = chats.findIndex(c=>c.id===id);
      if(idx===-1) return;
      const deletingActive = (activeId===id);
      chats.splice(idx,1);
      saveChats();
      if(chats.length===0){
        // No chats left: create a fresh one and clear view
        activeId = null; ensureActive();
        chatBody.innerHTML='';
        mainInput.value='';
        renderHistory();
        return;
      }
      if(deletingActive){
        // pick next item or previous or first
        const next = chats[idx] || chats[idx-1] || chats[0];
        activeId = next ? next.id : null;
        renderHistory();
        if(activeId){ selectChat(activeId); }
      }else{
        renderHistory();
      }
    }
    loadChats(); ensureActive(); renderHistory();

    function escapeHTML(s){
      return s.replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",
        ">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
    }
    function appendBubble(text, role){
      const div = document.createElement('div');
      div.className = 'msg ' + (role==='user'?'user':'ai');
      div.innerHTML = escapeHTML(text).replace(/\n/g,'<br>');
      chatBody.appendChild(div);
      chatBody.scrollTop = chatBody.scrollHeight;
    }
    function renderMessage(text, role){
      appendBubble(text, role);
      // persist after DOM append
      addMessageToActive(text, role);
    }
    function typing(on){
      if(on){
        const t = document.createElement('div'); t.className='typing msg ai'; t.textContent='OniAI is typing…'; t.id='typing'; chatBody.appendChild(t);
      }else{
        const t = document.getElementById('typing'); if(t) t.remove();
      }
      chatBody.scrollTop = chatBody.scrollHeight;
    }
    function fakeAIResponse(text){
      const trimmed = text.trim();
      if(!trimmed) return "";
      if(/[?？]$/.test(trimmed)){
        return "Хороший вопрос. Если кратко: давай уточним детали и я предложу варианты решения.";
      }
      if(trimmed.length < 20){
        return "Понял. Расскажи подробнее: цель, ограничения и желаемый результат.";
      }
      return "Я обработал твоё сообщение. Могу предложить план из 3–5 шагов или пример кода — скажи, что предпочтительнее?";
    }
    function replyAI(text){
      typing(true);
      setTimeout(()=>{
        typing(false);
        renderMessage(fakeAIResponse(text)||'Готов помочь.', 'ai');
      }, 600 + Math.min(1200, text.length*15));
    }

    function openChatWith(seed){
      // hide title & mini
      if(titleWrap){ titleWrap.classList.add('hide'); }
      if(mini){ mini.classList.add('hide'); }
      // show chat shell + panel
      try{ nameRef = window.userName || nameRef; }catch{}
      setSub();
      chatShell.classList.add('show');
      chatShell.style.display='grid';
      chatPanel.classList.add('show');
      // seed message
      if(seed){ renderMessage(seed, 'user'); replyAI(seed); }
      // focus main input
      setTimeout(()=> mainInput.focus(), 50);
    }

    function onMiniSend(){
      const text = (miniInput.value||'').trim();
      if(!text) return;
      openChatWith(text);
      miniInput.value='';
    }
    function onMainSend(){
      const text = (mainInput.value||'').trim();
      if(!text) return;
      renderMessage(text, 'user');
      replyAI(text);
      mainInput.value='';
    }

    function startNewChat(){
      // Create a new thread and select it
      const id = genId();
      chats.unshift({ id, title:'New chat', messages:[] });
      activeId = id; saveChats(); renderHistory();
      // Clear UI state
      const typingEl = document.getElementById('typing'); if(typingEl) typingEl.remove();
      chatBody.innerHTML = '';
      miniInput.value = '';
      mainInput.value = '';
      try{ nameRef = window.userName || nameRef; }catch{}
      setSub();
      mainInput.focus();
    }

    miniSend.addEventListener('click', onMiniSend);
    miniInput.addEventListener('keydown', e=>{ if(e.key==='Enter') onMiniSend(); });
    mainSend.addEventListener('click', onMainSend);
    mainInput.addEventListener('keydown', e=>{ if(e.key==='Enter' && !e.shiftKey) { e.preventDefault(); onMainSend(); } });
    if(chatNew){ chatNew.addEventListener('click', startNewChat); }
  })();

  /* -------------------------------------------------------
   * MICRO INTERACTIONS: glow on mouse
   * -----------------------------------------------------*/
  (function Glow(){
    const root=document.documentElement;
    addEventListener('mousemove', (e)=>{
      const x=e.clientX, y=e.clientY;
      root.style.setProperty('--mouseX', x+'px');
      root.style.setProperty('--mouseY', y+'px');
    },{passive:true});
  })();

  /* -------------------------------------------------------
   * PERF: prevent scroll bounce on mobile (we're fullscreen)
   * -----------------------------------------------------*/
  document.addEventListener('touchmove', e=> e.preventDefault(), {passive:false});
