const App = {
  currentSetor: null,
  currentSub: null,
  currentItems: [],
  isLogging: false,
  currentView: "grid",
  currentSort: "name_asc",
  currentFilter: "",
  currentMode: "drive",

  webAppUrl: "https://script.google.com/macros/s/AKfycbyTmGmfloBnoNyhuWcPN4BiQLim1C8PV4PnInLbgYixdPBTzVjPxB6jAi6ILQ0TBt9c1w/exec",

  DRIVE_API_KEY: "AIzaSyAgQfAHlLoRzuw11gYq9LrhzYlrqPOa85k",
  YT_API_KEY: "AIzaSyAgQfAHlLoRzuw11gYq9LrhzYlrqPOa85k",

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
      documentos: "ID_DOCS_DHO",
      instrucoes: "ID_INST_DHO"
    },

    "Produção": {
      "PCP": {
        documentos: "ID_DOCS_PCP",
        instrucoes: "1EaAxoVmQd2g1j-VH5cFAuUr5Qs-i2FIl"
      },

      "Corte": {
        documentos: "ID_DOCS_CORTE",
        instrucoes: "19U39-FdNEf6ZHLTEZuMM7tmm8Q96dEwN"
      },

      "Criação": {
        documentos: "ID_DOCS_CRIACAO",
        instrucoes: "ID_INST_CRIACAO"
      },

      "Acabamento": {
        documentos: "ID_DOCS_ACABAMENTO",
        instrucoes: "ID_INST_ACABAMENTO"
      }
    }

  },

  VIDEO_PLAYLISTS: {
    "Almoxarifado": { default: "PLxcB4sEuO-QT5eiWxacQXPJYsfm7lVWpx" },
    "Produção": { "PCP": "PLxcB4sEuO-QTIZ7dzkBq1pkriiWIFwGwX", "Acabamento": "PLxcB4sEuO-QSojlXG8VcLf3j2bdVltG72", "Criação": "PLxcB4sEuO-QT-pma_THf3312Iydlnbre-", "Corte": "PLxcB4sEuO-QSPNsR8bECf7v72IsB8m1u2", default: "" },
    "Logística": { default: "PLxcB4sEuO-QSorbIBZ-1FTQ2HAZUPuOkv" },
    "Comercial": { default: "PLxcB4sEuO-QQ0eTd4mpNw7L8YwcvWiCdK" },
    "Financeiro": { default: "PLxcB4sEuO-QTp_xpe4i81NJWOPB2Hz-t2" },
    "DHO": { default: "" }
  },

  init() {

    document.body.classList.add('dark');

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) themeToggle.innerHTML = '<i data-lucide="moon"></i>';

    this.checkSession();
    this.bindEvents();
    lucide.createIcons();

    const input = document.getElementById('userIdInput');
    if (input) input.focus();
  },

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
    btn.disabled = true;
    spinner.classList.remove('hidden');
    text.textContent = "Entrando...";

    try {
      const response = await fetch(`${this.webAppUrl}?id=${encodeURIComponent(id)}`);
      if (!response.ok) throw new Error();
      const data = await response.json();

      if (data.status === "ok") {
        const setores = this.normalizeSetores(
          Array.isArray(data.setores) ? data.setores : data.setor
        );

        const user = {
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
    } catch {
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

  bindEvents() {

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

    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
      themeToggle.onclick = () => {
        const isDark = document.body.classList.toggle('dark');
        themeToggle.innerHTML = isDark ? '<i data-lucide="moon"></i>' : '<i data-lucide="sun"></i>';
        lucide.createIcons();
      };
    }

    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
      btnLogout.onclick = () => {
        localStorage.removeItem('bc_user');
        window.location.reload();
      };
    }

    const btnBack = document.getElementById('btnBack');
    if (btnBack) btnBack.onclick = () => this.showCards();

    const producaoBtn = document.getElementById('producaoBtn');
    if (producaoBtn) {
      producaoBtn.onclick = () => {
        document.getElementById('producaoSubmenu').classList.toggle('open');
        producaoBtn.querySelector('.arrow').classList.toggle('rotate');
      };
    }

    document.querySelectorAll('.menu-item[data-setor], .submenu-item').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const setor = btn.dataset.setor;
        const sub = btn.dataset.subsetor || null;
        if (setor) this.selectSetor(setor, sub);
      };
    });

    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const sidebar = document.getElementById('sidebar');
    if (mobileMenuBtn && sidebar) {
      mobileMenuBtn.onclick = () => sidebar.classList.toggle('open');
    }
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
    document.getElementById('setorDescricao').textContent = `Selecione uma categoria de arquivos para ${sub || setor}.`;
  },

  showCards() {
    document.getElementById('cardsContainer').classList.remove('hidden');
    document.getElementById('listView').classList.add('hidden');
    document.getElementById('btnBack').classList.add('hidden');

    this.setHeaderSearchVisible(false);
    this.resetHeaderSearch();

    const savedUser = JSON.parse(localStorage.getItem('bc_user'));
    document.getElementById('setorTitulo').textContent = `Olá, ${savedUser ? savedUser.nome : 'Bem-vindo'}`;
    document.getElementById('setorDescricao').textContent = "Selecione uma categoria para iniciar.";
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

    } catch {
      this.hideLoading();
      listView.innerHTML = `<p style="padding:20px;color:#ef4444;">Erro ao carregar arquivos.</p>`;
    }
  },

  async openVideos() {
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
          <p style="margin-top:10px;color:var(--text-muted);">
            Configure em <code>VIDEO_PLAYLISTS</code> no arquivo <code>js/script.js</code>.
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

  playYoutube(videoId, title = "") {
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
  },

  closeVideo() {
    document.getElementById('videoModal').classList.add('hidden');
    document.getElementById('videoPlayer').src = "";
  }
};

App.init();