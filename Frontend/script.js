const base = ''; // el served from same origin

function showMsg(text) { const el = document.getElementById('messages'); el.innerText = text; setTimeout(()=> el.innerText = '', 3000); }
function showErr(text) { const el = document.getElementById('errors'); el.innerText = "⚠️ " + text; setTimeout(()=> el.innerText = '', 5000); }

function token() { return localStorage.getItem('ats_token'); }
function setToken(t){ if(t) localStorage.setItem('ats_token', t); else localStorage.removeItem('ats_token'); }
function userRole() { return localStorage.getItem('ats_role') || null; }
function setUserInfo(role,email) { if(role) { localStorage.setItem('ats_role', role); localStorage.setItem('ats_email', email); } else { localStorage.removeItem('ats_role'); localStorage.removeItem('ats_email'); } updateUserUI(); }
function updateUserUI() {
  const info = document.getElementById('userinfo');
  const role = userRole();
  const email = localStorage.getItem('ats_email') || '';
  if (!token()) {
    info.innerText = "Non connecté";
  } else {
    info.innerText = `Connecté : ${email} — rôle: ${role}`;
  }
}

async function safeFetch(url, options = {}) {
    options.headers = options.headers || {};
    if (!options.headers['Content-Type']) options.headers['Content-Type'] = 'application/json';
    const tok = token();
    if (tok) options.headers['Authorization'] = 'Bearer ' + tok;

    const res = await fetch(url, options);
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      const text = await res.text();
      throw new Error("Réponse serveur invalide: " + text.substring(0,200));
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || JSON.stringify(data));
    return data;
}

// ---------- Auth ----------
async function login(){
  try{
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    const data = await safeFetch(`${base}/auth/login`, {
      method:'POST',
      body: JSON.stringify({ email, password })
    });
    setToken(data.token);
    setUserInfo(data.role, data.email);
    showMsg("Connecté");
    loadApps();
  } catch(err){ console.error(err); showErr(err.message); }
}

function logout(){
  setToken(null);
  setUserInfo(null);
  showMsg("Déconnecté");
  loadApps();
}

// Ajouter candidature
async function addApp() {
  try {
    const body = {
      candidate_id: document.getElementById('candidate').value || undefined,
      job_id: document.getElementById('job').value || undefined,
      source: document.getElementById('source').value || "Email"
    };
    const data = await safeFetch(`${base}/applications`, {
      method: 'POST',
      body: JSON.stringify(body)
    });
    showMsg("Candidature ajoutée (id: " + data.id + ")");
    loadApps(); // Recharger la liste
  } catch (err) {
    console.error(err);
    showErr(err.message);
  }
}

// Charger liste des candidatures
async function loadApps() {
  try {
    const data = await safeFetch(`${base}/applications`);
    const list = document.getElementById('list');
    list.innerHTML = "";
    if (data.length === 0) { list.innerHTML = "<li>Aucune candidature</li>"; return; }
    data.forEach(a => {
      const id = a._id;
      const current = a.status || 'reçu';
      list.innerHTML += `
        <li>
          <div><strong>ID:</strong> ${id}</div>
          <div class="small"><strong>Status:</strong> ${current} — <strong>Source:</strong> ${a.source || 'N/A'}</div>
          <div class="flex">
            <select id="status-${id}">
              <option value="reçu">reçu</option>
              <option value="présélection">présélection</option>
              <option value="entretien">entretien</option>
              <option value="décision">décision</option>
              <option value="embauche">embauche</option>
              <option value="refus">refus</option>
            </select>
            <button onclick="changeStatus('${id}')">Changer</button>
          </div>
        </li>`;
      setTimeout(()=>{ const sel = document.getElementById(`status-${id}`); if(sel) sel.value = current; }, 0);
    });
  } catch(err) {
    console.error("loadApps error", err);
    showErr(err.message);
  }
}

// Changer statut
async function changeStatus(id) {
  try {
    const sel = document.getElementById(`status-${id}`);
    if (!sel) return;
    const newStatus = sel.value;
    const data = await safeFetch(`${base}/applications/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus })
    });
    showMsg(data.message);
    loadApps();
  } catch(err) {
    console.error(err);
    showErr(err.message);
  }
}

// Recherche
async function search() {
  try {
    const status = document.getElementById('searchStatus').value;
    const source = document.getElementById('searchSource').value;
    const q = new URLSearchParams();
    if(status) q.append('status', status);
    if(source) q.append('source', source);
    const data = await safeFetch(`${base}/search?${q.toString()}`);
    const out = document.getElementById('searchResults');
    out.innerHTML = "";
    if(!Array.isArray(data) || data.length === 0) { out.innerHTML = "<li>Aucun résultat</li>"; return; }
    data.forEach(a=>{ out.innerHTML += `<li><strong>${a.status}</strong> - Source: ${a.source || 'N/A'} <br><small>ID: ${a._id}</small></li>`; });
  } catch(err) { console.error("search error", err); showErr(err.message); }
}

// Charger KPI
async function loadKPI() {
  try {
    const data = await safeFetch(`${base}/kpi`);
    const kpi = document.getElementById('kpi');
    kpi.innerHTML = "";
    if(!Array.isArray(data) || data.length === 0) { kpi.innerHTML = "<li>Aucune donnée KPI</li>"; return; }
    data.forEach(s=>{ kpi.innerHTML += `<li><strong>${s._id || 'Indéfini'}</strong> : ${s.total}</li>`; });
  } catch(err) { console.error("kpi error", err); showErr(err.message); }
}

window.onload = () => {
  updateUserUI();
  // essayer de charger seulement si token présent
  if (token()) loadApps();
};