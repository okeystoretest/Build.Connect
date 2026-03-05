const App = {
  currentSetor: null,
  currentSub: null,
  currentItems: [],
  isLogging: false,
  currentView: "grid",
  currentSort: "name_asc",
  currentFilter: "",
  currentMode: "drive",

  // 🔥 URL DO SEU APPS SCRIPT (WEB APP /exec)
  webAppUrl: "https://script.google.com/macros/s/AKfycbyTmGmfloBnoNyhuWcPN4BiQLim1C8PV4PnInLbgYixdPBTzVjPxB6jAi6ILQ0TBt9c1w/exec",

  DRIVE_API_KEY: "AIzaSyAgQfAHlLoRzuw11gYq9LrhzYlrqPOa85k",
  YT_API_KEY: "AIzaSyAgQfAHlLoRzuw11gYq9LrhzYlrqPOa85k",

  // ✅ Pastas
  DRIVE_FOLDERS: {
    "Almoxarifado": {
      documentos: "1FKaYX29IkT00xfznPulppoN4XVwQe-qr",
      instrucoes: "1oboyv_pgo4sim9pbwkbdJm7-615moyzn"
    },

    "Logística": {
      documentos: "ID_DOCS_LOG",
      instrucoes: "1gnEXD07smUG8svJ8kSr0sXpkJT1NCCn0"
    },

    "Comercial": {
      documentos: "ID_DOCS_COMERCIAL",
      instrucoes: "ID_INST_COMERCIAL"
    },

    "Financeiro": {
      documentos: "ID_DOCS_FIN",
      instrucoes: "1-55mxZKIqN10DJHd4Kzv1xAZIOycxtYB"
    },

    "DHO": {
      documentos: "ID_DOCS_DHO"
      // ✅ DHO não terá instruções/vídeos (removido)
    },

    "Produção": {
      "PCP": { documentos: "ID_DOCS_PCP", instrucoes: "1EaAxoVmQd2g1j-VH5cFAuUr5Qs-i2FIl" },
      "Corte": { documentos: "ID_DOCS_CORTE", instrucoes: "19U39-FdNEf6ZHLTEZuMM7tmm8Q96dEwN" },
      "Criação": { documentos: "ID_DOCS_CRIACAO", instrucoes: "ID_INST_CRIACAO" },
      "Acabamento": { documentos: "ID_DOCS_ACABAMENTO", instrucoes: "ID_INST_ACABAMENTO" }
    }
  },

  // ✅ Playlists por setor/subsetor
  VIDEO_PLAYLISTS: {
    "Almoxarifado": { default: "PLxcB4sEuO-QT5eiWxacQXPJYsfm7lVWpx" },
    "Produção": {
      "PCP": "PLxcB4sEuO-QTIZ7dzkBq1pkriiWIFwGwX",
      "Acabamento": "PLxcB4sEuO-QSojlXG8VcLf3j2bdVltG72",
      "Criação": "PLxcB4sEuO-QT-pma_THf3312Iydlnbre-",
      "Corte": "PLxcB4sEuO-QSPNsR8bECf7v72IsB8m1u2",
      default: ""
    },
    "Logística": { default: "PLxcB4sEuO-QSorbIBZ-1FTQ2HAZUPuOkv" },
    "Comercial": { default: "PLxcB4sEuO-QQ0eTd4mpNw7L8YwcvWiCdK" },
    "Financeiro": { default: "PLxcB4sEuO-QTp_xpe4i81NJWOPB2Hz-t2" },
    "DHO": { default: "" } // ✅ DHO não usa vídeos
  },

  // ✅ Setores (botões do cadastro)
  SECTORS: ["ALMOXARIFADO", "LOGÍSTICA", "COMERCIAL", "FINANCEIRO", "DHO", "RETAGUARDA", "PRODUÇÃO"],

  // ======= Storage local (Questionários) =======
  LS_QUESTIONS_KEY: "bc_quiz_questions_v1",
  LS_ANSWERS_KEY: "bc_quiz_answers_v1",

  // ======= Estado do quiz atual (modal) =======
  currentVideoId: null,
  currentVideoTitle: "",

  init() {
    // 🔥 Modo escuro por padrão
    document.body.classList.add('dark');

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) themeToggle.innerHTML = '<i data-lucide="moon"></i>';

    this.checkSession();
    this.bindEvents();
    this.renderCardsForCurrent(); // se já tiver setor selecionado
    lucide.createIcons();

    const input = document.getElementById('userIdInput');
    if (input) input.focus();
  },

  // ======= JSONP (resolve CORS) =======
  jsonp(url, params = {}) {
    return new Promise((resolve, reject) => {
      const cbName = `__bc_cb_${Date.now()}_${Math.floor(Math.random() * 999999)}`;
      const query = new URLSearchParams({ ...params, callback: cbName }).toString();
      const src = `${url}${url.includes("?") ? "&" : "?"}${query}`;

      const script = document.createElement("script");
      script.src = src;
      script.async = true;

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("Timeout JSONP"));
      }, 12000);

      const cleanup = () => {
        clearTimeout(timeout);
        delete window[cbName];
        if (script.parentNode) script.parentNode.removeChild(script);
      };

      window[cbName] = (data) => {
        cleanup();
        resolve(data);
      };

      script.onerror = () => {
        cleanup();
        reject(new Error("Falha ao carregar JSONP"));
      };

      document.body.appendChild(script);
    });
  },

  // ======= Session =======
  checkSession() {
    const savedUser = localStorage.getItem('bc_user');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        this.loginSuccess(user);
      } catch {
        localStorage.removeItem('bc_user');
      }
    }
  },

  normalizeSetores(valueOrArray) {
    if (Array.isArray(valueOrArray)) {
      return valueOrArray
        .map(s => String(s || "").trim().toUpperCase())
        .filter(Boolean);
    }

    const raw = String(valueOrArray || "");
    return raw
      .split(/[;,|]/g)
      .map(s => s.trim().toUpperCase())
      .filter(Boolean);
  },

  showLoginError(msg) {
    const box = document.getElementById('loginError');
    const txt = document.getElementById('loginErrorText');

    if (txt) txt.textContent = msg || "ID não localizado na base de dados.";
    if (box) box.classList.remove('hidden');

    const card = document.querySelector('.card-login');
    if (card) {
      card.classList.remove('login-shake');
      void card.offsetWidth;
      card.classList.add('login-shake');
    }
    lucide.createIcons();
  },

  hideLoginError() {
    const box = document.getElementById('loginError');
    if (box) box.classList.add('hidden');
  },

  async handleLogin() {
    if (this.isLogging) return;

    const idInput = document.getElementById('userIdInput');
    const id = (idInput?.value || "").trim();
    const btn = document.getElementById('btnLogin');
    const spinner = document.getElementById('loginSpinner');
    const text = document.getElementById('loginText');

    if (!id) {
      this.showLoginError("Digite seu ID.");
      idInput?.focus();
      return;
    }

    this.isLogging = true;
    this.hideLoginError();
    if (btn) btn.disabled = true;
    if (spinner) spinner.classList.remove('hidden');
    if (text) text.textContent = "Entrando...";

    try {
      // ✅ JSONP (sem CORS)
      const data = await this.jsonp(this.webAppUrl, { action: "login", id });

      if (data.status === "ok") {
        const setores = this.normalizeSetores(Array.isArray(data.setores) ? data.setores : data.setor);

        const user = {
          id: id,
          nome: data.nome,
          setor: data.setor,
          setores
        };

        localStorage.setItem('bc_user', JSON.stringify(user));
        setTimeout(() => this.loginSuccess(user), 250);
      } else {
        this.showLoginError(data.message || "ID não encontrado.");
        this.resetLoginState();
      }
    } catch (err) {
      console.error(err);
      this.showLoginError("Erro ao conectar com o servidor.");
      this.resetLoginState();
    }
  },

  resetLoginState() {
    const btn = document.getElementById('btnLogin');
    const spinner = document.getElementById('loginSpinner');
    const text = document.getElementById('loginText');

    if (btn) btn.disabled = false;
    if (spinner) spinner.classList.add('hidden');
    if (text) text.textContent = "Entrar";
    this.isLogging = false;
  },

  loginSuccess(user) {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('appMain').classList.remove('hidden');
    document.getElementById('setorTitulo').textContent = `Olá, ${user.nome}`;

    this.applyPermissions(user.setores || user.setor);

    // ✅ Por padrão volta pro “Bem-vindo”
    document.getElementById('setorDescricao').textContent = "Selecione um setor para iniciar.";
    this.currentSetor = null;
    this.currentSub = null;
    this.renderCardsForCurrent();

    lucide.createIcons();
    this.isLogging = false;
  },

  applyPermissions(userSetores) {
    const setores = this.normalizeSetores(userSetores);

    const allMenuItems = document.querySelectorAll('[data-permission]');
    const producaoGroup = document.querySelector('.menu-group[data-permission="PRODUÇÃO"]');

    if (setores.includes("RETAGUARDA")) {
      allMenuItems.forEach(item => item.classList.remove('hidden'));
      if (producaoGroup) producaoGroup.classList.remove('hidden');
      return;
    }

    allMenuItems.forEach(item => item.classList.add('hidden'));
    if (producaoGroup) producaoGroup.classList.add('hidden');

    if (setores.includes("PRODUÇÃO")) {
      if (producaoGroup) producaoGroup.classList.remove('hidden');
    }

    allMenuItems.forEach(item => {
      const perm = String(item.dataset.permission || "").toUpperCase().trim();

      if (perm === "ALL") {
        item.classList.remove('hidden');
        return;
      }

      if (setores.includes(perm)) {
        item.classList.remove('hidden');
      }
    });
  },

  // ======= UI / Events =======
  bindEvents() {
    // Toggle senha do ID
    const idInput = document.getElementById('userIdInput');
    const toggleBtn = document.getElementById('toggleIdVisibility');

    if (toggleBtn && idInput) {
      toggleBtn.onclick = () => {
        const isPassword = idInput.getAttribute("type") === "password";
        idInput.setAttribute("type", isPassword ? "text" : "password");
        toggleBtn.innerHTML = isPassword
          ? '<i data-lucide="eye-off"></i>'
          : '<i data-lucide="eye"></i>';
        lucide.createIcons();
        idInput.focus();
      };
    }

    if (idInput) {
      idInput.addEventListener('keydown', (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.handleLogin();
        }
      });
    }

    const btnLogin = document.getElementById('btnLogin');
    if (btnLogin) btnLogin.onclick = () => this.handleLogin();

    // Search header
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearch');

    if (searchInput) {
      searchInput.oninput = (e) => {
        const term = e.target.value.toLowerCase();
        term.length > 0 ? clearBtn.classList.remove('hidden') : clearBtn.classList.add('hidden');
        this.currentFilter = term;

        if (!document.getElementById('listView').classList.contains('hidden')) {
          this.renderCurrent();
        }
      };
    }

    if (clearBtn && searchInput) {
      clearBtn.onclick = () => {
        searchInput.value = "";
        clearBtn.classList.add('hidden');
        searchInput.focus();
        this.currentFilter = "";
        if (!document.getElementById('listView').classList.contains('hidden')) {
          this.renderCurrent();
        }
      };
    }

    // Theme
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.onclick = () => {
        const isDark = document.body.classList.toggle('dark');
        themeToggle.innerHTML = isDark ? '<i data-lucide="moon"></i>' : '<i data-lucide="sun"></i>';
        lucide.createIcons();
      };
    }

    // Logout
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
      btnLogout.onclick = () => {
        localStorage.removeItem('bc_user');
        window.location.reload();
      };
    }

    // Back
    const btnBack = document.getElementById('btnBack');
    if (btnBack) btnBack.onclick = () => this.showCards();

    // Produção submenu
    const producaoBtn = document.getElementById('producaoBtn');
    if (producaoBtn) {
      producaoBtn.onclick = () => {
        document.getElementById('producaoSubmenu').classList.toggle('open');
        producaoBtn.querySelector('.arrow').classList.toggle('rotate');
      };
    }

    // Menu selection
    document.querySelectorAll('.menu-item[data-setor], .submenu-item').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const setor = btn.dataset.setor;
        const sub = btn.dataset.subsetor || null;
        if (setor) this.selectSetor(setor, sub);

        // ✅ mobile: fecha ao clicar
        this.closeSidebarMobile();
      };
    });

    // Mobile sidebar open/close
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    if (mobileMenuBtn && sidebar && overlay) {
      mobileMenuBtn.onclick = () => this.toggleSidebarMobile(true);

      overlay.onclick = () => this.toggleSidebarMobile(false);

      // Fecha com ESC
      window.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
          if (sidebar.classList.contains("open")) this.toggleSidebarMobile(false);
        }
      });
    }

    // Quiz submit
    const quizSubmitBtn = document.getElementById("quizSubmitBtn");
    if (quizSubmitBtn) {
      quizSubmitBtn.onclick = () => this.submitQuizAnswers();
    }
  },

  toggleSidebarMobile(open) {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (!sidebar || !overlay) return;

    if (open) {
      sidebar.classList.add('open');
      overlay.classList.remove('hidden');
    } else {
      sidebar.classList.remove('open');
      overlay.classList.add('hidden');
    }
  },

  closeSidebarMobile() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    if (window.matchMedia("(max-width: 768px)").matches && sidebar.classList.contains("open")) {
      this.toggleSidebarMobile(false);
    }
  },

  // ======= Cards (dinâmico) =======
  renderCardsForCurrent() {
    const container = document.getElementById("cardsContainer");
    if (!container) return;

    // se não tiver setor selecionado, mantém vazio e escondido
    if (!this.currentSetor) {
      container.classList.add("hidden");
      container.innerHTML = "";
      return;
    }

    const setor = this.currentSetor;
    const isDHO = (setor || "").toUpperCase() === "DHO";

    // Cards padrão (exceto DHO)
    const defaultCards = `
      <div class="card documentos" onclick="App.openDrive('documentos')">
        <div class="card-icon"><i data-lucide="file-text"></i></div>
        <h3>Documentos</h3>
        <p>Políticas e registros oficiais.</p>
      </div>

      <div class="card instrucoes" onclick="App.openDrive('instrucoes')">
        <div class="card-icon"><i data-lucide="book-open"></i></div>
        <h3>Instruções de Trabalho</h3>
        <p>Padrões operacionais.</p>
      </div>

      <div class="card videos" onclick="App.openVideos()">
        <div class="card-icon"><i data-lucide="video"></i></div>
        <h3>Vídeos</h3>
        <p>Treinamentos e conteúdos do setor.</p>
      </div>
    `;

    // Cards DHO (remove Instruções e Vídeos)
    const dhoCards = `
      <div class="card documentos" onclick="App.openDrive('documentos')">
        <div class="card-icon"><i data-lucide="file-text"></i></div>
        <h3>Documentos</h3>
        <p>Políticas e registros oficiais.</p>
      </div>

      <div class="card cadastro" onclick="App.openUserRegistration()">
        <div class="card-icon"><i data-lucide="user-plus"></i></div>
        <h3>Cadastro de Usuários</h3>
        <p>Cadastrar novos colaboradores no Login DB.</p>
      </div>

      <div class="card questionarios" onclick="App.openQuizManager()">
        <div class="card-icon"><i data-lucide="clipboard-list"></i></div>
        <h3>Questionários</h3>
        <p>Criar perguntas por vídeo (local).</p>
      </div>

      <div class="card respostas" onclick="App.openQuizAnswers()">
        <div class="card-icon"><i data-lucide="file-check"></i></div>
        <h3>Respostas Questionários</h3>
        <p>Visualizar respostas dos colaboradores (local).</p>
      </div>
    `;

    container.innerHTML = isDHO ? dhoCards : defaultCards;
    container.classList.remove("hidden");
    lucide.createIcons();
  },

  selectSetor(setor, sub = null) {
    this.currentSetor = setor;
    this.currentSub = sub;

    const container = document.getElementById('cardsContainer');
    container.classList.remove('hidden');
    container.classList.remove('animate-in');
    void container.offsetWidth;
    container.classList.add('animate-in');

    document.getElementById('listView').classList.add('hidden');
    document.getElementById('btnBack').classList.add('hidden');

    this.setHeaderSearchVisible(false);
    this.resetHeaderSearch();

    document.getElementById('setorTitulo').textContent = sub ? `${setor} • ${sub}` : setor;
    document.getElementById('setorDescricao').textContent = `Selecione uma categoria para ${sub || setor}.`;

    this.renderCardsForCurrent();
  },

  showCards() {
    document.getElementById('cardsContainer').classList.remove('hidden');
    document.getElementById('listView').classList.add('hidden');
    document.getElementById('btnBack').classList.add('hidden');

    this.setHeaderSearchVisible(false);
    this.resetHeaderSearch();

    const savedUser = JSON.parse(localStorage.getItem('bc_user'));
    document.getElementById('setorTitulo').textContent = `Olá, ${savedUser ? savedUser.nome : 'Bem-vindo'}`;
    document.getElementById('setorDescricao').textContent = "Selecione um setor para iniciar.";

    // mantém cards do setor atual
    this.renderCardsForCurrent();
  },

  setHeaderSearchVisible(visible) {
    const wrapper = document.getElementById('searchWrapper');
    if (!wrapper) return;
    visible ? wrapper.classList.remove('hidden') : wrapper.classList.add('hidden');
  },

  resetHeaderSearch() {
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('clearSearch');
    if (searchInput) searchInput.value = "";
    if (clearBtn) clearBtn.classList.add('hidden');
    this.currentFilter = "";
  },

  showLoading(text = "Carregando...") {
    const loading = document.getElementById('loadingIndicator');
    if (!loading) return;
    loading.querySelector("p").textContent = text;
    loading.classList.remove('hidden');
  },

  hideLoading() {
    const loading = document.getElementById('loadingIndicator');
    if (!loading) return;
    loading.classList.add('hidden');
  },

  // ======= Drive =======
  async openDrive(type) {
    this.currentMode = "drive";
    document.getElementById('cardsContainer').classList.add('hidden');
    document.getElementById('btnBack').classList.remove('hidden');
    this.setHeaderSearchVisible(true);

    const listView = document.getElementById('listView');
    listView.classList.remove('hidden');
    listView.innerHTML = "";

    let folderId;

    if (this.currentSetor === "Produção" && this.currentSub) {
      folderId = this.DRIVE_FOLDERS["Produção"]?.[this.currentSub]?.[type];
    } else {
      folderId = this.DRIVE_FOLDERS[this.currentSetor]?.[type];
    }

    if (!folderId) {
      listView.innerHTML = `<p style="padding:20px;color:var(--text-muted);">Pasta não configurada.</p>`;
      return;
    }

    this.showLoading("Buscando arquivos no Drive...");

    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents and trashed=false&fields=files(id,name,webViewLink,mimeType,modifiedTime)&orderBy=name&key=${this.DRIVE_API_KEY}`
      );

      const data = await response.json();
      if (!data.files) throw new Error();

      this.currentItems = data.files;
      this.hideLoading();
      this.renderCurrent();

    } catch (err) {
      console.error(err);
      this.hideLoading();
      listView.innerHTML = `<p style="padding:20px;color:#ef4444;">Erro ao carregar arquivos.</p>`;
    }
  },

  // ======= Vídeos (exceto DHO) =======
  async openVideos() {
    if ((this.currentSetor || "").toUpperCase() === "DHO") {
      const listView = document.getElementById('listView');
      document.getElementById('cardsContainer').classList.add('hidden');
      document.getElementById('btnBack').classList.remove('hidden');
      this.setHeaderSearchVisible(false);

      listView.classList.remove('hidden');
      listView.innerHTML = `
        <div class="panel">
          <h2>Vídeos</h2>
          <p>O setor DHO não utiliza o card de vídeos (conforme ajuste solicitado).</p>
        </div>
      `;
      return;
    }

    this.currentMode = "videos";
    document.getElementById('cardsContainer').classList.add('hidden');
    document.getElementById('btnBack').classList.remove('hidden');
    this.setHeaderSearchVisible(true);

    const listView = document.getElementById('listView');
    listView.classList.remove('hidden');
    listView.innerHTML = "";

    const playlistId = this.getPlaylistIdForCurrent();
    if (!playlistId) {
      listView.innerHTML = `
        <div style="padding:20px;">
          <p style="color:var(--text-muted);">
            Nenhuma playlist configurada para <strong>${this.currentSub ? `${this.currentSetor} • ${this.currentSub}` : this.currentSetor}</strong>.
          </p>
        </div>
      `;
      return;
    }

    this.showLoading("Buscando vídeos da playlist...");

    try {
      const videos = await this.fetchAllPlaylistVideos(playlistId);
      this.currentItems = videos.map(v => ({
        id: v.videoId,
        name: v.title,
        webViewLink: "#",
        mimeType: "video/youtube",
      }));

      this.hideLoading();
      this.renderCurrent();

    } catch (err) {
      console.error(err);
      this.hideLoading();
      listView.innerHTML = `<p style="padding:20px;color:#ef4444;">Erro ao carregar vídeos da playlist.</p>`;
    }
  },

  getPlaylistIdForCurrent() {
    const setor = this.currentSetor;
    const sub = this.currentSub;

    const map = this.VIDEO_PLAYLISTS[setor] || {};
    const raw = (sub && map[sub]) ? map[sub] : (map.default || "");
    return (raw || "").trim();
  },

  async fetchAllPlaylistVideos(playlistId) {
    const out = [];
    let pageToken = "";
    let safety = 0;

    while (safety < 20) {
      safety++;

      const url =
        `https://www.googleapis.com/youtube/v3/playlistItems?` +
        `part=snippet&maxResults=50&playlistId=${encodeURIComponent(playlistId)}` +
        (pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ``) +
        `&key=${encodeURIComponent(this.YT_API_KEY)}`;

      const res = await fetch(url);
      const data = await res.json();

      if (!data.items) {
        const msg = data?.error?.message || "Resposta inválida da API do YouTube.";
        throw new Error(msg);
      }

      for (const item of data.items) {
        const sn = item.snippet;
        const title = sn?.title || "Sem título";
        const videoId = sn?.resourceId?.videoId;

        if (!videoId) continue;
        if (title.toLowerCase().includes("private video")) continue;
        if (title.toLowerCase().includes("deleted video")) continue;

        out.push({ videoId, title });
      }

      pageToken = data.nextPageToken || "";
      if (!pageToken) break;
    }

    return out;
  },

  // ======= Render itens (Drive + Vídeos) =======
  renderCurrent() {
    this.renderItems();
  },

  getFilteredSortedItems() {
    const filter = (this.currentFilter || "").trim().toLowerCase();
    const items = (this.currentItems || []).filter(f => {
      if (!filter) return true;
      return (f.name || "").toLowerCase().includes(filter);
    });

    const collator = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });
    items.sort((a, b) => {
      const an = a.name || "";
      const bn = b.name || "";
      if (this.currentSort === "name_desc") return collator.compare(bn, an);
      return collator.compare(an, bn);
    });

    return items;
  },

  getIconForItem(mimeType = "", name = "") {
    if (mimeType === "video/youtube") return "video";
    const lowerName = (name || "").toLowerCase();

    if (mimeType === "application/vnd.google-apps.document") return "file-text";
    if (mimeType === "application/vnd.google-apps.spreadsheet") return "file-spreadsheet";
    if (mimeType === "application/vnd.google-apps.presentation") return "presentation";
    if (mimeType === "application/vnd.google-apps.form") return "clipboard-list";
    if (mimeType === "application/vnd.google-apps.folder") return "folder";
    if (mimeType === "application/pdf" || lowerName.endsWith(".pdf")) return "file-text";

    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("audio/")) return "music";
    if (mimeType.includes("zip") || lowerName.endsWith(".zip")) return "file-archive";
    if (mimeType.includes("text/") || lowerName.endsWith(".txt")) return "file-code";

    return "file";
  },

  renderItems() {
    const listView = document.getElementById('listView');
    const items = this.getFilteredSortedItems();

    const title = this.currentMode === "videos" ? "Vídeos" : "Arquivos";

    listView.innerHTML = `
      <div class="files-toolbar">
        <div class="files-toolbar-left">
          <div class="view-toggle">
            <button id="gridViewBtn" class="view-btn ${this.currentView === "grid" ? "active" : ""}" title="Grid">
              <i data-lucide="grid"></i>
            </button>
            <button id="listViewBtn" class="view-btn ${this.currentView === "list" ? "active" : ""}" title="Lista">
              <i data-lucide="list"></i>
            </button>
          </div>
        </div>

        <div class="files-toolbar-right" style="display:flex;align-items:center;gap:10px;">
          <select id="sortSelect" class="sort-select" title="Ordenar">
            <option value="name_asc" ${this.currentSort === "name_asc" ? "selected" : ""}>${title}: Nome (A → Z)</option>
            <option value="name_desc" ${this.currentSort === "name_desc" ? "selected" : ""}>${title}: Nome (Z → A)</option>
          </select>
        </div>
      </div>

      <div id="itemsContainer" class="${this.currentView === "grid" ? "grid-view" : "list-view"}"></div>

      ${items.length === 0 ? `<p style="padding:14px;color:var(--text-muted);">Nenhum item encontrado.</p>` : ``}
    `;

    const container = document.getElementById('itemsContainer');

    items.forEach(item => {
      const icon = this.getIconForItem(item.mimeType, item.name);
      const card = document.createElement('div');
      card.className = "file-card";

      const isVideo = item.mimeType === "video/youtube";
      const onClick = () => {
        if (isVideo) this.playYoutube(item.id, item.name);
        else window.open(item.webViewLink, "_blank", "noopener");
      };

      card.innerHTML = `
        <a class="file-link" href="javascript:void(0)">
          <div class="file-icon"><i data-lucide="${icon}"></i></div>
          <div class="file-meta">
            <div class="file-name">${item.name}</div>
          </div>
        </a>
      `;

      card.querySelector("a").onclick = (e) => {
        e.preventDefault();
        onClick();
      };

      container.appendChild(card);
    });

    document.getElementById('gridViewBtn').onclick = () => {
      this.currentView = "grid";
      this.renderCurrent();
    };

    document.getElementById('listViewBtn').onclick = () => {
      this.currentView = "list";
      this.renderCurrent();
    };

    document.getElementById('sortSelect').onchange = (e) => {
      this.currentSort = e.target.value;
      this.renderCurrent();
    };

    lucide.createIcons();
  },

  // ======= Player (modal) + Quiz abaixo =======
  playYoutube(videoId, title = "") {
    this.currentVideoId = videoId;
    this.currentVideoTitle = title || "";

    const params = new URLSearchParams({
      autoplay: "1",
      rel: "0",
      modestbranding: "1",
      controls: "1",
      fs: "1",
      iv_load_policy: "3",
      playsinline: "1"
    });

    const src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?${params.toString()}`;

    document.getElementById('videoPlayer').src = src;
    document.getElementById('videoModal').classList.remove('hidden');

    // ✅ mostra questionário (exceto DHO)
    const isDHO = (this.currentSetor || "").toUpperCase() === "DHO";
    if (!isDHO) {
      this.renderQuizForVideo(videoId);
    } else {
      document.getElementById("quizPanel").classList.add("hidden");
    }

    lucide.createIcons();
  },

  closeVideo() {
    document.getElementById('videoModal').classList.add('hidden');
    document.getElementById('videoPlayer').src = "";

    // reset quiz view
    this.currentVideoId = null;
    this.currentVideoTitle = "";
    this.hideQuizMsg();
  },

  // ======= Quiz: perguntas/respostas (localStorage) =======
  loadQuestionsMap() {
    try {
      const raw = localStorage.getItem(this.LS_QUESTIONS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  },

  saveQuestionsMap(map) {
    localStorage.setItem(this.LS_QUESTIONS_KEY, JSON.stringify(map || {}));
  },

  loadAnswersList() {
    try {
      const raw = localStorage.getItem(this.LS_ANSWERS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveAnswersList(list) {
    localStorage.setItem(this.LS_ANSWERS_KEY, JSON.stringify(list || []));
  },

  renderQuizForVideo(videoId) {
    const panel = document.getElementById("quizPanel");
    const body = document.getElementById("quizBody");
    const pill = document.getElementById("quizStatusPill");
    const sub = document.getElementById("quizSub");
    const btn = document.getElementById("quizSubmitBtn");

    if (!panel || !body || !pill || !sub || !btn) return;

    const questionsMap = this.loadQuestionsMap();
    const questions = Array.isArray(questionsMap[videoId]) ? questionsMap[videoId] : [];

    panel.classList.remove("hidden");
    body.innerHTML = "";
    this.hideQuizMsg();

    // status pill
    if (questions.length === 0) {
      pill.textContent = "Sem perguntas";
      sub.textContent = "Nenhuma pergunta configurada para este vídeo.";
      btn.disabled = true;
      btn.style.opacity = "0.6";
      return;
    }

    pill.textContent = "Pendente";
    sub.textContent = "Responda as perguntas abaixo e envie.";
    btn.disabled = false;
    btn.style.opacity = "1";

    for (const q of questions) {
      const qId = q.id;
      const text = q.text || "Pergunta";

      const wrap = document.createElement("div");
      wrap.className = "quiz-q";
      wrap.innerHTML = `
        <div class="q-title">${this.escapeHtml(text)}</div>
        <textarea data-qid="${this.escapeHtml(qId)}" placeholder="Digite sua resposta..."></textarea>
      `;
      body.appendChild(wrap);
    }

    lucide.createIcons();
  },

  submitQuizAnswers() {
    const videoId = this.currentVideoId;
    if (!videoId) return;

    const user = this.getCurrentUser();
    if (!user) {
      this.showQuizMsg("Você precisa estar logado para responder.", true);
      return;
    }

    const questionsMap = this.loadQuestionsMap();
    const questions = Array.isArray(questionsMap[videoId]) ? questionsMap[videoId] : [];
    if (!questions.length) {
      this.showQuizMsg("Este vídeo não possui perguntas.", true);
      return;
    }

    const inputs = Array.from(document.querySelectorAll(`#quizBody textarea[data-qid]`));
    const answers = {};
    for (const el of inputs) {
      const qid = el.getAttribute("data-qid");
      answers[qid] = (el.value || "").trim();
    }

    // valida: não enviar tudo vazio
    const anyFilled = Object.values(answers).some(v => v.length > 0);
    if (!anyFilled) {
      this.showQuizMsg("Preencha pelo menos uma resposta antes de enviar.", true);
      return;
    }

    const list = this.loadAnswersList();
    list.push({
      videoId,
      videoTitle: this.currentVideoTitle || "",
      userId: user.id || "",
      userName: user.nome || "",
      userSetores: (user.setores || []),
      answers,
      createdAt: new Date().toISOString()
    });

    this.saveAnswersList(list);

    this.showQuizMsg("Respostas enviadas com sucesso!", false);

    // marca pill
    const pill = document.getElementById("quizStatusPill");
    if (pill) pill.textContent = "Enviado";
  },

  showQuizMsg(msg, isError = false) {
    const el = document.getElementById("quizMsg");
    if (!el) return;
    el.textContent = msg || "";
    el.classList.remove("hidden");

    if (isError) {
      el.style.background = "rgba(239, 68, 68, 0.12)";
      el.style.border = "1px solid rgba(239, 68, 68, 0.2)";
      el.style.color = "#fecaca";
    } else {
      el.style.background = "rgba(34,197,94,.12)";
      el.style.border = "1px solid rgba(34,197,94,.2)";
      el.style.color = "#86efac";
    }
  },

  hideQuizMsg() {
    const el = document.getElementById("quizMsg");
    if (!el) return;
    el.classList.add("hidden");
    el.textContent = "";
  },

  // ======= DHO: Cadastro de Usuários =======
  openUserRegistration() {
    this.currentMode = "dho_register";
    document.getElementById('cardsContainer').classList.add('hidden');
    document.getElementById('btnBack').classList.remove('hidden');
    this.setHeaderSearchVisible(false);

    const listView = document.getElementById('listView');
    listView.classList.remove('hidden');

    listView.innerHTML = `
      <div class="panel">
        <h2>Cadastro de Usuários</h2>
        <p>Cadastra diretamente na planilha <b>Login DB</b>. O ID é digitado (sem geração automática).<br>
        <span style="opacity:.85;">Setores aceitam múltipla seleção (ex.: PRODUÇÃO, ALMOXARIFADO).</span></p>

        <div class="form-grid">
          <div class="field">
            <label>ID</label>
            <input id="regId" placeholder="Ex.: 009" inputmode="numeric" autocomplete="off">
          </div>

          <div class="field">
            <label>Nome</label>
            <input id="regName" placeholder="Nome do colaborador" autocomplete="off">
          </div>
        </div>

        <div class="field" style="margin-top:12px;">
          <label>Setores (toque para selecionar)</label>
          <div class="sector-buttons" id="sectorButtons"></div>
        </div>

        <div class="actions-row">
          <button id="btnCreateUser" class="btn-wide">
            <i data-lucide="save"></i>
            <span>Cadastrar</span>
          </button>
        </div>

        <div id="regMsg" class="quiz-msg hidden" style="margin-top:14px;"></div>
      </div>
    `;

    // render botões
    const wrap = document.getElementById("sectorButtons");
    const selected = new Set();

    for (const s of this.SECTORS) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "sector-btn";
      b.textContent = s;
      b.onclick = () => {
        if (selected.has(s)) {
          selected.delete(s);
          b.classList.remove("active");
        } else {
          selected.add(s);
          b.classList.add("active");
        }
      };
      wrap.appendChild(b);
    }

    document.getElementById("btnCreateUser").onclick = async () => {
      const id = (document.getElementById("regId")?.value || "").trim();
      const name = (document.getElementById("regName")?.value || "").trim();
      const setores = Array.from(selected);

      if (!id) return this.showRegMsg("Informe o ID.", true);
      if (!name) return this.showRegMsg("Informe o nome.", true);
      if (!setores.length) return this.showRegMsg("Selecione pelo menos 1 setor.", true);

      // salva no Login DB via JSONP (GET)
      try {
        this.showRegMsg("Cadastrando...", false);

        const data = await this.jsonp(this.webAppUrl, {
          action: "create_user",
          id,
          nome: name,
          setores: setores.join(", ")
        });

        if (data.status === "ok") {
          this.showRegMsg("Usuário cadastrado com sucesso!", false);

          // limpa
          document.getElementById("regId").value = "";
          document.getElementById("regName").value = "";
          selected.clear();
          document.querySelectorAll(".sector-btn.active").forEach(x => x.classList.remove("active"));
        } else {
          this.showRegMsg(data.message || "Não foi possível cadastrar.", true);
        }
      } catch (err) {
        console.error(err);
        this.showRegMsg("Erro ao conectar com o servidor.", true);
      }
    };

    lucide.createIcons();
  },

  showRegMsg(msg, isError) {
    const el = document.getElementById("regMsg");
    if (!el) return;
    el.classList.remove("hidden");
    el.textContent = msg || "";

    if (isError) {
      el.style.background = "rgba(239, 68, 68, 0.12)";
      el.style.border = "1px solid rgba(239, 68, 68, 0.2)";
      el.style.color = "#fecaca";
    } else {
      el.style.background = "rgba(34,197,94,.12)";
      el.style.border = "1px solid rgba(34,197,94,.2)";
      el.style.color = "#86efac";
    }
  },

  // ======= DHO: Gerenciar Perguntas =======
  openQuizManager() {
    this.currentMode = "dho_quiz_manager";
    document.getElementById('cardsContainer').classList.add('hidden');
    document.getElementById('btnBack').classList.remove('hidden');
    this.setHeaderSearchVisible(false);

    const listView = document.getElementById('listView');
    listView.classList.remove('hidden');

    listView.innerHTML = `
      <div class="panel">
        <h2>Questionários</h2>
        <p>Crie perguntas por vídeo. <b>Armazenamento local</b> (localStorage).</p>

        <div class="form-grid">
          <div class="field">
            <label>Setor</label>
            <select id="qmSetor"></select>
          </div>
          <div class="field">
            <label>Sub-setor (Produção)</label>
            <select id="qmSub">
              <option value="">(não se aplica)</option>
              <option value="PCP">PCP</option>
              <option value="Corte">Corte</option>
              <option value="Criação">Criação</option>
              <option value="Acabamento">Acabamento</option>
            </select>
          </div>
        </div>

        <div class="actions-row">
          <button id="qmLoad" class="btn-wide">
            <i data-lucide="download"></i>
            <span>Carregar vídeos</span>
          </button>
        </div>

        <div id="qmArea" style="margin-top:14px;"></div>
      </div>
    `;

    // setores (sem DHO)
    const qmSetor = document.getElementById("qmSetor");
    const setoresSemDHO = this.SECTORS.filter(s => s !== "DHO");
    qmSetor.innerHTML = setoresSemDHO.map(s => `<option value="${this.escapeHtml(s)}">${this.escapeHtml(s)}</option>`).join("");

    document.getElementById("qmLoad").onclick = async () => {
      const setor = qmSetor.value;
      const sub = document.getElementById("qmSub").value || "";

      // calcula playlist pelo mapa
      let playlistId = "";
      if (setor === "PRODUÇÃO") {
        playlistId = (this.VIDEO_PLAYLISTS["Produção"]?.[sub] || "").trim();
      } else {
        // setor em caps -> precisa bater com chave original (Logística, etc)
        // cria mapeamento reverso
        const original = this.findOriginalSectorKey(setor);
        playlistId = (this.VIDEO_PLAYLISTS[original]?.default || "").trim();
      }

      const area = document.getElementById("qmArea");
      if (!playlistId) {
        area.innerHTML = `<p style="color:var(--text-muted);">Playlist não configurada para esse setor/sub-setor.</p>`;
        return;
      }

      area.innerHTML = `<p style="color:var(--text-muted);">Carregando vídeos...</p>`;

      try {
        const videos = await this.fetchAllPlaylistVideos(playlistId);
        const questionsMap = this.loadQuestionsMap();

        area.innerHTML = `
          <div class="panel" style="margin-top:10px;">
            <h2 style="margin-bottom:8px;">Vídeos (${videos.length})</h2>
            <p>Selecione um vídeo para cadastrar perguntas.</p>

            <div class="field" style="margin-top:12px;">
              <label>Vídeo</label>
              <select id="qmVideoSelect"></select>
            </div>

            <div class="field" style="margin-top:12px;">
              <label>Pergunta</label>
              <input id="qmQuestionText" placeholder="Digite a pergunta...">
            </div>

            <div class="actions-row">
              <button id="qmAdd" class="btn-wide">
                <i data-lucide="plus"></i>
                <span>Adicionar pergunta</span>
              </button>
            </div>

            <div id="qmList" style="margin-top:14px;"></div>
          </div>
        `;

        const sel = document.getElementById("qmVideoSelect");
        sel.innerHTML = videos.map(v => `<option value="${this.escapeHtml(v.videoId)}">${this.escapeHtml(v.title)}</option>`).join("");

        const renderList = () => {
          const vid = sel.value;
          const qs = Array.isArray(questionsMap[vid]) ? questionsMap[vid] : [];
          const box = document.getElementById("qmList");

          if (!qs.length) {
            box.innerHTML = `<p style="color:var(--text-muted);">Nenhuma pergunta cadastrada para este vídeo.</p>`;
            return;
          }

          box.innerHTML = `
            <div class="panel" style="padding:14px;">
              <h2 style="font-size:16px;margin-bottom:10px;">Perguntas</h2>
              <div style="display:flex;flex-direction:column;gap:10px;">
                ${qs.map(q => `
                  <div class="quiz-q" style="background:var(--glass);color:var(--text);">
                    <div class="q-title" style="color:var(--text);">${this.escapeHtml(q.text)}</div>
                    <div style="display:flex;justify-content:flex-end;margin-top:10px;">
                      <button class="btn-wide" style="padding:10px 12px;border-radius:14px;" data-del="${this.escapeHtml(q.id)}">
                        <i data-lucide="trash-2"></i><span>Remover</span>
                      </button>
                    </div>
                  </div>
                `).join("")}
              </div>
            </div>
          `;

          box.querySelectorAll("[data-del]").forEach(btn => {
            btn.onclick = () => {
              const qid = btn.getAttribute("data-del");
              questionsMap[vid] = (questionsMap[vid] || []).filter(x => x.id !== qid);
              this.saveQuestionsMap(questionsMap);
              renderList();
            };
          });

          lucide.createIcons();
        };

        sel.onchange = () => renderList();

        document.getElementById("qmAdd").onclick = () => {
          const vid = sel.value;
          const text = (document.getElementById("qmQuestionText").value || "").trim();
          if (!text) return;

          const q = { id: `q_${Date.now()}_${Math.floor(Math.random() * 99999)}`, text };
          if (!Array.isArray(questionsMap[vid])) questionsMap[vid] = [];
          questionsMap[vid].push(q);

          this.saveQuestionsMap(questionsMap);

          document.getElementById("qmQuestionText").value = "";
          renderList();
        };

        renderList();
        lucide.createIcons();

      } catch (err) {
        console.error(err);
        area.innerHTML = `<p style="color:#ef4444;">Erro ao carregar vídeos.</p>`;
      }
    };

    lucide.createIcons();
  },

  // ======= DHO: Ver respostas =======
  openQuizAnswers() {
    this.currentMode = "dho_quiz_answers";
    document.getElementById('cardsContainer').classList.add('hidden');
    document.getElementById('btnBack').classList.remove('hidden');
    this.setHeaderSearchVisible(false);

    const listView = document.getElementById('listView');
    listView.classList.remove('hidden');

    const answers = this.loadAnswersList();

    listView.innerHTML = `
      <div class="panel">
        <h2>Respostas Questionários</h2>
        <p>Visualização local (localStorage). Total: <b>${answers.length}</b> respostas.</p>

        <div class="field" style="margin-top:12px;">
          <label>Filtrar por ID do colaborador (opcional)</label>
          <input id="ansFilterUser" placeholder="Ex.: 001">
        </div>

        <div class="actions-row">
          <button id="ansApply" class="btn-wide">
            <i data-lucide="filter"></i>
            <span>Aplicar filtro</span>
          </button>
        </div>

        <div id="ansList" style="margin-top:14px;"></div>
      </div>
    `;

    const render = () => {
      const filterUser = (document.getElementById("ansFilterUser").value || "").trim();
      const list = document.getElementById("ansList");

      const filtered = filterUser
        ? answers.filter(a => String(a.userId || "") === filterUser)
        : answers;

      if (!filtered.length) {
        list.innerHTML = `<p style="color:var(--text-muted);">Nenhuma resposta encontrada.</p>`;
        return;
      }

      list.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:12px;">
          ${filtered.map((a, idx) => {
        const date = a.createdAt ? new Date(a.createdAt).toLocaleString("pt-BR") : "";
        const qEntries = Object.entries(a.answers || {});
        return `
              <div class="panel" style="padding:14px;">
                <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;">
                  <div>
                    <div style="font-weight:900;">${this.escapeHtml(a.userName || "Usuário")}</div>
                    <div style="color:var(--text-muted);font-size:12.5px;">
                      ID: <b>${this.escapeHtml(a.userId || "")}</b> • Vídeo: <b>${this.escapeHtml(a.videoTitle || a.videoId || "")}</b>
                    </div>
                  </div>
                  <div style="color:var(--text-muted);font-size:12.5px;white-space:nowrap;">${this.escapeHtml(date)}</div>
                </div>

                <div style="margin-top:10px;display:flex;flex-direction:column;gap:10px;">
                  ${qEntries.map(([qid, val]) => `
                    <div class="quiz-q" style="background:var(--bg);">
                      <div class="q-title" style="color:var(--text);">Pergunta ${this.escapeHtml(qid)}</div>
                      <div style="color:var(--text-muted);font-size:13px;white-space:pre-wrap;">${this.escapeHtml(val || "(vazio)")}</div>
                    </div>
                  `).join("")}
                </div>

                <div class="actions-row" style="margin-top:10px;">
                  <button class="btn-wide" style="padding:10px 12px;border-radius:14px;" data-delans="${idx}">
                    <i data-lucide="trash-2"></i><span>Excluir</span>
                  </button>
                </div>
              </div>
            `;
      }).join("")}
        </div>
      `;

      list.querySelectorAll("[data-delans]").forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.getAttribute("data-delans"), 10);
          if (Number.isNaN(idx)) return;
          // remove pelo índice dentro do filtered -> precisa achar no array real
          const item = filtered[idx];
          const all = this.loadAnswersList();
          const newAll = all.filter(x => !(x.createdAt === item.createdAt && x.userId === item.userId && x.videoId === item.videoId));
          this.saveAnswersList(newAll);
          // recarrega
          this.openQuizAnswers();
        };
      });

      lucide.createIcons();
    };

    document.getElementById("ansApply").onclick = () => render();

    render();
    lucide.createIcons();
  },

  // ======= Helpers =======
  getCurrentUser() {
    try {
      const raw = localStorage.getItem("bc_user");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  escapeHtml(str) {
    return String(str || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  },

  findOriginalSectorKey(upper) {
    // mapeia "LOGÍSTICA" -> "Logística" etc
    const keys = Object.keys(this.VIDEO_PLAYLISTS);
    for (const k of keys) {
      if (String(k).toUpperCase() === String(upper).toUpperCase()) return k;
    }
    return upper; // fallback
  }
};

App.init();