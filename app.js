(() => {
  // Theme toggle
  const toggle = document.getElementById('themeToggle');
  const savedTheme = localStorage.getItem('palette-theme') || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  setTheme(savedTheme);
  toggle.checked = savedTheme !== 'light';
  toggle.addEventListener('change', () => setTheme(toggle.checked ? 'dark' : 'light'));
  function setTheme(t){ document.documentElement.classList.toggle('light', t==='light'); localStorage.setItem('palette-theme', t); }

  const grid = document.querySelector('.grid');
  const modeSel = document.getElementById('modeSel');
  const newBtn = document.getElementById('newBtn');
  const saveBtn = document.getElementById('saveBtn');
  const savedList = document.getElementById('savedList');
  const clearSaved = document.getElementById('clearSaved');

  let palette = new Array(5).fill('#000000');
  let locks = new Array(5).fill(false);

  function rand(min,max){ return Math.random()*(max-min)+min; }
  function hslToHex(h,s,l){
    s/=100; l/=100;
    const c=(1-Math.abs(2*l-1))*s;
    const x=c*(1-Math.abs((h/60)%2-1));
    const m=l-c/2;
    let [r,g,b]=[0,0,0];
    if(0<=h&&h<60){r=c;g=x;b=0}
    else if(60<=h&&h<120){r=x;g=c;b=0}
    else if(120<=h&&h<180){r=0;g=c;b=x}
    else if(180<=h&&h<240){r=0;g=x;b=c}
    else if(240<=h&&h<300){r=x;g=0;b=c}
    else {r=c;g=0;b=x}
    r = Math.round((r+m)*255); g = Math.round((g+m)*255); b = Math.round((b+m)*255);
    return '#' + [r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();
  }
  function hexToHsl(hex){
    const r = parseInt(hex.substr(1,2),16)/255;
    const g = parseInt(hex.substr(3,2),16)/255;
    const b = parseInt(hex.substr(5,2),16)/255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    let h,s,l=(max+min)/2;
    if(max===min){ h = s = 0; }
    else {
      const d = max - min;
      s = l>0.5 ? d/(2-max-min) : d/(max+min);
      switch(max){
        case r: h=(g-b)/d + (g<b?6:0); break;
        case g: h=(b-r)/d + 2; break;
        case b: h=(r-g)/d + 4; break;
      }
      h*=60; s*=100; l*=100;
    }
    return {h,s,l};
  }

  function generate(mode='random'){
    let baseH = Math.floor(rand(0,360));
    let baseS = Math.floor(rand(55, 80));
    let baseL = Math.floor(rand(45, 65));
    const colors = [];

    function push(h, s=baseS, l=baseL){
      h = (h+360)%360;
      colors.push(hslToHex(h, s, l));
    }

    if(mode==='mono'){
      const step = rand(6,10);
      for(let i=0;i<5;i++) push(baseH, baseS, Math.min(80, Math.max(25, baseL + (i-2)*step)));
    } else if(mode==='analogous'){
      const step = rand(18,26);
      for(let i=0;i<5;i++) push(baseH + (i-2)*step);
    } else if(mode==='complementary'){
      [baseH, baseH+20, baseH+40, baseH+180, baseH+200].forEach(h=>push(h));
    } else if(mode==='triad'){
      [baseH, baseH+120, baseH+240, baseH+120+20, baseH+240+20].forEach(h=>push(h));
    } else if(mode==='tetrad'){
      [baseH, baseH+90, baseH+180, baseH+270, baseH+45].forEach(h=>push(h));
    } else {
      for(let i=0;i<5;i++) push(baseH + rand(-180, 180), Math.floor(rand(55,85)), Math.floor(rand(40,70)));
    }

    for(let i=0;i<5;i++){
      if(locks[i]) continue;
      palette[i] = colors[i];
    }
    render();
  }

  function render(){
    grid.innerHTML = '';
    palette.forEach((hex, i) => {
      const {h,s,l} = hexToHsl(hex);
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="swatch" style="background:${hex}">
          <div class="actions">
            <div class="icon copy" title="Copy">⧉</div>
            <div class="icon lock ${locks[i]?'locked':''}" title="Lock">🔒</div>
          </div>
        </div>
        <div class="meta">
          <div class="hex" data-hex="${hex}">${hex}</div>
          <div class="badge">${Math.round(h)}° ${Math.round(s)}% ${Math.round(l)}%</div>
        </div>
      `;
      card.querySelector('.copy').addEventListener('click', () => copy(hex));
      card.querySelector('.hex').addEventListener('click', () => copy(hex));
      card.querySelector('.lock').addEventListener('click', (e) => {
        locks[i] = !locks[i];
        e.currentTarget.classList.toggle('locked', locks[i]);
      });
      grid.appendChild(card);
    });
  }

  function copy(text){
    navigator.clipboard.writeText(text).then(()=>{
      newBtn.textContent = 'Copied!';
      setTimeout(()=> newBtn.textContent = 'New Palette', 600);
    });
  }

  function save(){
    const items = JSON.parse(localStorage.getItem('palettes') || '[]');
    items.unshift(palette);
    localStorage.setItem('palettes', JSON.stringify(items.slice(0,50)));
    renderSaved();
  }

  function renderSaved(){
    const items = JSON.parse(localStorage.getItem('palettes') || '[]');
    savedList.innerHTML = '';
    items.forEach(pal => {
      const el = document.createElement('div');
      el.className = 'saved-item';
      pal.forEach(h => {
        const s = document.createElement('span');
        s.style.background = h;
        s.title = h;
        s.addEventListener('click', () => copy(h));
        el.appendChild(s);
      });
      el.addEventListener('click', () => { palette = pal.slice(); locks=[false,false,false,false,false]; render(); });
      savedList.appendChild(el);
    });
  }

  // Events
  newBtn.addEventListener('click', () => generate(modeSel.value));
  saveBtn.addEventListener('click', save);
  clearSaved.addEventListener('click', () => { localStorage.removeItem('palettes'); renderSaved(); });
  document.addEventListener('keydown', (e)=>{
    if(e.code === 'Space'){ generate(modeSel.value); e.preventDefault(); }
  });

  // Init
  generate('random');
  renderSaved();
})();