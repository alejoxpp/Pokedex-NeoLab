/**
 * POKÉDEX NEO LAB · js/pokedex.js
 * Lógica interactiva de la Landing Page estilo Anime Pokémon
 * Consumo con ApiClient (Backend Node.js / PokeAPI Fallback) + GSAP 3
 */

(function () {
  'use strict';

  // Constantes
  const THEME_KEY = 'pokedex_neo_theme';
  const TEAM_KEY = 'pokedex_neo_team';
  const PAGE_SIZE = 24;
  const ALL_TYPES = ['all', 'normal', 'fire', 'water', 'grass', 'electric', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'];

  // Elementos del DOM
  const $themeToggle = document.getElementById('themeToggle');
  const $searchInput = document.getElementById('searchInput');
  const $searchBtn = document.getElementById('searchBtn');
  const $genSelect = document.getElementById('genSelect');
  const $sortSelect = document.getElementById('sortSelect');
  const $typeFilters = document.getElementById('typeFilters');
  const $pokedexGrid = document.getElementById('pokedexGrid');
  const $counter = document.getElementById('counter');
  const $loader = document.getElementById('loaderContainer');
  const $loaderText = document.getElementById('loaderText');
  const $loadMore = document.getElementById('loadMore');
  const $sentinel = document.getElementById('sentinel');
  const $status = document.getElementById('statusContainer');
  const $modalBackdrop = document.getElementById('modalBackdrop');
  const $modal = document.getElementById('pokemonModal');
  const $backendBadge = document.getElementById('backendStatusBadge');

  // Elementos Trivia
  const $triviaImg = document.getElementById('triviaImg');
  const $triviaPrompt = document.getElementById('triviaPrompt');
  const $triviaOptions = document.getElementById('triviaOptions');
  const $triviaResult = document.getElementById('triviaResult');
  const $triviaResultName = document.getElementById('triviaResultName');
  const $triviaResultDesc = document.getElementById('triviaResultDesc');
  const $triviaCryBtn = document.getElementById('triviaCryBtn');
  const $nextTriviaBtn = document.getElementById('nextTriviaBtn');
  const $triviaRevealFlash = document.getElementById('triviaRevealFlash');

  // Elementos Arena 2vs2
  const $fighterEmptyA = document.getElementById('fighterEmptyA');
  const $fighterCardA = document.getElementById('fighterCardA');
  const $fighterEmptyB = document.getElementById('fighterEmptyB');
  const $fighterCardB = document.getElementById('fighterCardB');
  const $doBattleBtn = document.getElementById('doBattleBtn');
  const $battleVerdict = document.getElementById('battleVerdict');
  const $compareBar = document.getElementById('compareBar');
  const $slot0 = document.getElementById('slot0');
  const $slot1 = document.getElementById('slot1');
  const $clearCompareBtn = document.getElementById('clearCompareBtn');
  const $goToArenaBtn = document.getElementById('goToArenaBtn');

  // Elementos Equipo de 6
  const $teamBeltGrid = document.getElementById('teamBeltGrid');
  const $teamBadgeTop = document.getElementById('teamBadgeTop');
  const $teamCountSummary = document.getElementById('teamCountSummary');
  const $teamAverageCP = document.getElementById('teamAverageCP');
  const $teamTypesCovered = document.getElementById('teamTypesCovered');
  const $clearTeamBtn = document.getElementById('clearTeamBtn');
  const $exportTeamBtn = document.getElementById('exportTeamBtn');

  // Elementos Featured Hero
  const $featuredId = document.getElementById('featuredId');
  const $featuredImg = document.getElementById('featuredImg');
  const $featuredName = document.getElementById('featuredName');
  const $featuredTypes = document.getElementById('featuredTypes');
  const $featuredDesc = document.getElementById('featuredDesc');
  const $featuredCP = document.getElementById('featuredCP');
  const $featuredWeight = document.getElementById('featuredWeight');
  const $featuredHeight = document.getElementById('featuredHeight');
  const $featuredCryBtn = document.getElementById('featuredCryBtn');
  const $featuredDetailBtn = document.getElementById('featuredDetailBtn');
  const $featuredTeamBtn = document.getElementById('featuredTeamBtn');

  // Estado Global
  let allPokemonList = [];
  let filteredList = [];
  let visibleCount = PAGE_SIZE;
  let activeType = 'all';
  let searchTerm = '';
  let sortBy = 'id-asc';
  let currentGen = '1';
  let isLoading = false;
  let observer = null;

  let myTeam = JSON.parse(localStorage.getItem(TEAM_KEY) || '[]'); // Array de objetos { id, name, sprite, types, cp }
  let arenaFighters = []; // [pokemonA, pokemonB]
  let currentTriviaData = null;
  let currentFeaturedPokemon = null;

  // Helpers
  const pad3 = n => String(n).padStart(3, '0');
  const totalCP = p => (p.stats || []).reduce((sum, s) => sum + (s.value || s.base_stat || 0), 0);
  const debounce = (fn, ms) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  };

  // Sonido de Grito
  function playCry(id) {
    const audio = new Audio(`https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${id}.ogg`);
    audio.volume = 0.55;
    audio.play().catch(() => {
      const fallback = new Audio(`https://play.pokemonshowdown.com/audio/cries/${pad3(id)}.mp3`);
      fallback.volume = 0.55;
      fallback.play().catch(() => console.log('Audio no disponible'));
    });
  }

  // Feedback de Sistema
  function showStatus(msg, isError = false) {
    if (!$status) return;
    $status.textContent = msg;
    $status.style.display = 'block';
    $status.classList.toggle('error', isError);
    if (window.anime) {
      try {
        anime({
          targets: $status,
          translateY: [-8, 0],
          opacity: [0, 1],
          duration: 320,
          easing: 'easeOutQuad'
        });
      } catch {}
    }
  }

  function hideStatus() {
    if ($status) $status.style.display = 'none';
  }

  // Loader
  function showLoader(text = 'Sintonizando frecuencia con PokeAPI…') {
    if ($loader) $loader.style.display = 'flex';
    if ($loaderText) $loaderText.textContent = text;
    if ($pokedexGrid) $pokedexGrid.innerHTML = '';
    if ($loadMore) $loadMore.style.display = 'none';
  }

  function hideLoader() {
    if ($loader) $loader.style.display = 'none';
  }

  // 1. TEMA CLARO / OSCURO
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    if ($themeToggle) {
      $themeToggle.textContent = theme === 'light' ? '☀️' : '🌙';
      $themeToggle.title = theme === 'light' ? 'Cambiar a modo noche' : 'Cambiar a modo día';
    }
  }

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY) || 'dark';
    applyTheme(saved);
    if ($themeToggle) {
      $themeToggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme') || 'dark';
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        if (window.gsap) gsap.fromTo($themeToggle, { rotation: -30, scale: 0.8 }, { rotation: 0, scale: 1, duration: 0.35, ease: 'back.out(2)', clearProps: 'transform' });
      });
    }
  }

  // 2. HERO FEATURED POKÉMON (Pokémon del Día)
  async function loadFeaturedPokemon() {
    try {
      // Pokémon icónicos o aleatorio
      const featuredPool = [25, 6, 9, 3, 150, 249, 384, 448, 658, 888, 1008];
      const selectedId = featuredPool[Math.floor(Math.random() * featuredPool.length)];
      const detail = await ApiClient.getPokemonDetail(selectedId);
      currentFeaturedPokemon = detail;

      if ($featuredId) $featuredId.textContent = `#${pad3(detail.id)}`;
      if ($featuredName) $featuredName.textContent = detail.name;
      if ($featuredImg) $featuredImg.src = detail.sprites.normal;
      if ($featuredDesc) $featuredDesc.textContent = detail.description;
      if ($featuredCP) $featuredCP.textContent = detail.stats.reduce((acc, s) => acc + s.value, 0);
      if ($featuredWeight) $featuredWeight.textContent = `${(detail.weight / 10).toFixed(1)} kg`;
      if ($featuredHeight) $featuredHeight.textContent = `${(detail.height / 10).toFixed(1)} m`;

      if ($featuredTypes) {
        $featuredTypes.innerHTML = detail.types.map(t => `<span class="badge type-${t}">${t}</span>`).join('');
      }

      if ($featuredCryBtn) {
        $featuredCryBtn.onclick = () => playCry(detail.id);
      }
      if ($featuredDetailBtn) {
        $featuredDetailBtn.onclick = () => openHoloScan(detail.id);
      }
      if ($featuredTeamBtn) {
        $featuredTeamBtn.onclick = () => toggleTeamMember({
          id: detail.id,
          name: detail.name,
          sprite: detail.sprites.normal,
          types: detail.types,
          cp: detail.stats.reduce((acc, s) => acc + s.value, 0)
        });
      }

      if (window.gsap) {
        // fromTo con clearProps: estado final explicito y sin residuos inline
        gsap.fromTo('#featuredCard',
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.8, ease: 'back.out(1.2)', clearProps: 'opacity,transform' }
        );
      }
    } catch (e) {
      console.warn('No se pudo cargar el Pokémon destacado', e);
    }
  }

  // 3. TRIVIA: "¿QUIÉN ES ESTE POKÉMON?"
  async function loadTrivia() {
    try {
      if ($triviaImg) {
        $triviaImg.classList.remove('revealed');
      }
      if ($triviaResult) {
        $triviaResult.style.display = 'none';
        // Limpia residuos inline de animaciones previas (evita estados invisibles)
        $triviaResult.style.opacity = '';
        $triviaResult.style.transform = '';
      }
      if ($triviaPrompt) $triviaPrompt.textContent = '¿Cuál es el nombre de este Pokémon?';
      if ($triviaOptions) $triviaOptions.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-muted)">Cargando silueta...</p>';

      const trivia = await ApiClient.getTrivia();
      currentTriviaData = trivia;

      if ($triviaImg) {
        $triviaImg.src = trivia.sprite;
      }

      if ($triviaOptions) {
        $triviaOptions.innerHTML = '';
        trivia.options.forEach(optName => {
          const btn = document.createElement('button');
          btn.className = 'btn-trivia-opt';
          btn.textContent = optName;
          btn.addEventListener('click', () => handleTriviaAnswer(btn, optName, trivia));
          $triviaOptions.appendChild(btn);
        });
      }
    } catch (e) {
      console.error('Error cargando trivia', e);
    }
  }

  function handleTriviaAnswer(selectedBtn, chosenName, trivia) {
    const isCorrect = chosenName.toLowerCase() === trivia.name.toLowerCase();
    const allBtns = $triviaOptions.querySelectorAll('.btn-trivia-opt');
    allBtns.forEach(b => {
      b.disabled = true;
      if (b.textContent.toLowerCase() === trivia.name.toLowerCase()) {
        b.classList.add('correct');
      }
    });

    if (!isCorrect) {
      selectedBtn.classList.add('wrong');
    }

    // Efecto Flash y Revelación
    if ($triviaRevealFlash) {
      $triviaRevealFlash.style.opacity = '1';
      setTimeout(() => { $triviaRevealFlash.style.opacity = '0'; }, 200);
    }

    if ($triviaImg) {
      $triviaImg.classList.add('revealed');
    }

    playCry(trivia.id);

    if ($triviaResult) {
      $triviaResult.style.display = 'block';
      if ($triviaResultName) {
        $triviaResultName.textContent = isCorrect ? `¡Correcto! ¡Es ${trivia.name}! 🎉` : `¡Oh no! Era ${trivia.name}!`;
      }
      if ($triviaResultDesc) {
        $triviaResultDesc.textContent = trivia.flavorText;
      }
      if ($triviaCryBtn) {
        $triviaCryBtn.onclick = () => playCry(trivia.id);
      }
    }

    // La animacion de entrada la aporta el CSS (.trivia-result { animation: fadeIn })
    // al pasar de display:none a block. Un gsap.from() aqui competiria con esa animacion
    // y, si el tween se interrumpe, dejaria opacity:0 en linea (elemento invisible).
  }

  if ($nextTriviaBtn) {
    $nextTriviaBtn.addEventListener('click', loadTrivia);
  }

  // 4. SHOWCASE & CATÁLOGO POKÉDEX
  function buildTypeFilters() {
    if (!$typeFilters) return;
    $typeFilters.innerHTML = '';
    ALL_TYPES.forEach(type => {
      const chip = document.createElement('button');
      chip.className = `type-chip ${type === activeType ? 'active' : ''} ${type !== 'all' ? 'type-' + type : ''}`;
      chip.dataset.type = type;
      chip.textContent = type === 'all' ? 'Todos' : type;
      chip.addEventListener('click', () => {
        activeType = type;
        document.querySelectorAll('.type-chip').forEach(c => c.classList.toggle('active', c.dataset.type === type));
        visibleCount = PAGE_SIZE;
        applyFilters();
      });
      $typeFilters.appendChild(chip);
    });
  }

  function createPokemonCard(p) {
    const card = document.createElement('div');
    card.className = 'pokemon-card';
    card.dataset.id = p.id;
    card.tabIndex = 0;

    const spr = p.sprites?.other?.['official-artwork']?.front_default || p.sprites?.front_default || '';
    const types = (p.types || []).map(t => t.type ? t.type.name : t);
    const badges = types.map(t => `<span class="badge type-${t}">${t}</span>`).join('');
    const cp = totalCP(p);
    const hp = p.stats?.find(s => (s.stat?.name || s.name) === 'hp')?.base_stat || p.stats?.find(s => s.name === 'hp')?.value || '—';
    const atk = p.stats?.find(s => (s.stat?.name || s.name) === 'attack')?.base_stat || p.stats?.find(s => s.name === 'attack')?.value || '—';
    const def = p.stats?.find(s => (s.stat?.name || s.name) === 'defense')?.base_stat || p.stats?.find(s => s.name === 'defense')?.value || '—';

    const isInTeam = myTeam.some(m => m.id === p.id);
    const isInArena = arenaFighters.some(f => f.id === p.id);

    if (isInArena) card.classList.add('in-arena');

    card.innerHTML = `
      <div class="card-top-pod">
        <div class="card-screen">
          <img src="${spr}" alt="${p.name}" loading="lazy" onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png'">
          <span class="card-id-tag">#${pad3(p.id)}</span>
          <div class="card-quick-actions">
            <button class="btn-card-action btn-team-toggle ${isInTeam ? 'active-team' : ''}" title="${isInTeam ? 'Quitar del equipo' : 'Añadir a mi equipo'}">${isInTeam ? '⚡' : '＋'}</button>
            <button class="btn-card-action btn-arena-toggle ${isInArena ? 'active-arena' : ''}" title="Seleccionar para Arena 2vs2">⚔️</button>
          </div>
        </div>
      </div>
      <div class="card-bottom-info">
        <h4 class="card-poke-name">${p.name}</h4>
        <div class="card-types-list">${badges}</div>
        <div class="card-mini-stats">
          <div class="mini-stat-cell"><b>${hp}</b><i>PS</i></div>
          <div class="mini-stat-cell"><b>${atk}</b><i>ATK</i></div>
          <div class="mini-stat-cell"><b>${def}</b><i>DEF</i></div>
        </div>
      </div>
    `;

    // Eventos de la tarjeta
    const teamBtn = card.querySelector('.btn-team-toggle');
    teamBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleTeamMember({
        id: p.id,
        name: p.name,
        sprite: spr,
        types: types,
        cp: cp
      });
      teamBtn.classList.toggle('active-team', myTeam.some(m => m.id === p.id));
      teamBtn.textContent = myTeam.some(m => m.id === p.id) ? '⚡' : '＋';
    });

    const arenaBtn = card.querySelector('.btn-arena-toggle');
    arenaBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleArenaFighter(p);
    });

    card.addEventListener('click', () => openHoloScan(p.id));

    return card;
  }

  function renderGrid(list) {
    if (!$pokedexGrid) return;
    $pokedexGrid.innerHTML = '';

    if (!list.length) {
      $pokedexGrid.innerHTML = `
        <div style="grid-column:1/-1;text-align:center;padding:3rem 1rem;background:var(--surface);border-radius:var(--radius-lg);border:2px dashed var(--border-line)">
          <h3 style="font-family:var(--font-heading);color:var(--poke-yellow);margin-bottom:.5rem">¡Sin resultados en el escáner! 🔍</h3>
          <p style="color:var(--text-muted);font-size:.9rem">No se encontró ningún Pokémon con ese nombre o tipo.</p>
        </div>
      `;
      if ($counter) $counter.textContent = '0 Pokémon encontrados';
      if ($loadMore) $loadMore.style.display = 'none';
      hideLoader();
      return;
    }

    const slice = list.slice(0, visibleCount);
    const frag = document.createDocumentFragment();
    slice.forEach(p => frag.appendChild(createPokemonCard(p)));
    $pokedexGrid.appendChild(frag);

    if ($counter) {
      $counter.innerHTML = `Mostrando <b>${slice.length}</b> de <b>${list.length}</b> Pokémon`;
    }

    const hasMore = slice.length < list.length;
    if ($loadMore) {
      $loadMore.style.display = hasMore ? 'inline-flex' : 'none';
      $loadMore.textContent = `Cargar más Pokémon +${Math.min(PAGE_SIZE, list.length - slice.length)}`;
    }

    hideLoader();

    if (window.gsap) {
      const cards = $pokedexGrid.querySelectorAll('.pokemon-card');
      gsap.fromTo(cards, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.35, stagger: 0.025, ease: 'power2.out', overwrite: true, clearProps: 'opacity,transform' });
    }
  }

  function applyFilters() {
    let out = [...allPokemonList];

    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      out = out.filter(p => {
        const nameMatch = p.name.toLowerCase().includes(query);
        const idMatch = String(p.id) === query || pad3(p.id).includes(query);
        const typeMatch = (p.types || []).some(t => {
          const tName = t.type ? t.type.name : t;
          return tName.toLowerCase().includes(query);
        });
        return nameMatch || idMatch || typeMatch;
      });
    }

    if (activeType !== 'all') {
      out = out.filter(p => {
        return (p.types || []).some(t => {
          const tName = t.type ? t.type.name : t;
          return tName.toLowerCase() === activeType.toLowerCase();
        });
      });
    }

    switch (sortBy) {
      case 'id-asc': out.sort((a, b) => a.id - b.id); break;
      case 'id-desc': out.sort((a, b) => b.id - a.id); break;
      case 'name-asc': out.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'name-desc': out.sort((a, b) => b.name.localeCompare(a.name)); break;
      case 'cp-desc': out.sort((a, b) => totalCP(b) - totalCP(a)); break;
    }

    filteredList = out;
    renderGrid(filteredList);
  }

  async function loadPokedexData() {
    if (isLoading) return;
    isLoading = true;
    showLoader(`Escaneando región / Gen ${currentGen} con PokeAPI…`);

    try {
      const list = await ApiClient.getPokemonList({ gen: currentGen });
      allPokemonList = list;
      filteredList = [...allPokemonList];
      visibleCount = PAGE_SIZE;
      applyFilters();
      isLoading = false;
      showStatus(`¡Escaneo completo! ${list.length} Pokémon cargados.`);
      setTimeout(hideStatus, 1800);
    } catch (err) {
      console.error(err);
      isLoading = false;
      hideLoader();
      showStatus('Error al conectar con la Pokédex.', true);
    }
  }

  // 5. ARENA DE BATALLA 2VS2
  function updateArenaUI() {
    const fA = arenaFighters[0];
    const fB = arenaFighters[1];

    if (fA) {
      if ($fighterEmptyA) $fighterEmptyA.style.display = 'none';
      if ($fighterCardA) {
        $fighterCardA.style.display = 'block';
        const sprA = fA.sprites?.other?.['official-artwork']?.front_default || fA.sprites?.front_default || '';
        $fighterCardA.innerHTML = `
          <div class="fighter-card-content">
            <img src="${sprA}" alt="${fA.name}">
            <h4>${fA.name}</h4>
            <p style="color:var(--poke-cyan);font-weight:800">CP: ${totalCP(fA)}</p>
            <button class="btn-sm btn-anime-ghost" style="margin-top:.4rem;padding:.2rem .6rem" onclick="window.removeFighter(0)">Quitar</button>
          </div>
        `;
      }
      if ($slot0) {
        $slot0.classList.remove('empty');
        $slot0.innerHTML = `<img src="${fA.sprites?.front_default || ''}" alt="${fA.name}">`;
      }
    } else {
      if ($fighterEmptyA) $fighterEmptyA.style.display = 'block';
      if ($fighterCardA) $fighterCardA.style.display = 'none';
      if ($slot0) {
        $slot0.classList.add('empty');
        $slot0.innerHTML = '<span>1</span>';
      }
    }

    if (fB) {
      if ($fighterEmptyB) $fighterEmptyB.style.display = 'none';
      if ($fighterCardB) {
        $fighterCardB.style.display = 'block';
        const sprB = fB.sprites?.other?.['official-artwork']?.front_default || fB.sprites?.front_default || '';
        $fighterCardB.innerHTML = `
          <div class="fighter-card-content">
            <img src="${sprB}" alt="${fB.name}">
            <h4>${fB.name}</h4>
            <p style="color:var(--poke-cyan);font-weight:800">CP: ${totalCP(fB)}</p>
            <button class="btn-sm btn-anime-ghost" style="margin-top:.4rem;padding:.2rem .6rem" onclick="window.removeFighter(1)">Quitar</button>
          </div>
        `;
      }
      if ($slot1) {
        $slot1.classList.remove('empty');
        $slot1.innerHTML = `<img src="${fB.sprites?.front_default || ''}" alt="${fB.name}">`;
      }
    } else {
      if ($fighterEmptyB) $fighterEmptyB.style.display = 'block';
      if ($fighterCardB) $fighterCardB.style.display = 'none';
      if ($slot1) {
        $slot1.classList.add('empty');
        $slot1.innerHTML = '<span>2</span>';
      }
    }

    if ($doBattleBtn) {
      $doBattleBtn.disabled = arenaFighters.length !== 2;
    }

    if ($compareBar) {
      $compareBar.classList.toggle('show', arenaFighters.length > 0);
    }

    if ($battleVerdict && arenaFighters.length < 2) {
      $battleVerdict.style.display = 'none';
    }

    // Actualizar estados en el grid
    document.querySelectorAll('.pokemon-card').forEach(c => {
      const id = parseInt(c.dataset.id, 10);
      const isFighter = arenaFighters.some(f => f.id === id);
      c.classList.toggle('in-arena', isFighter);
      const btn = c.querySelector('.btn-arena-toggle');
      if (btn) btn.classList.toggle('active-arena', isFighter);
    });
  }

  function toggleArenaFighter(pokemon) {
    const idx = arenaFighters.findIndex(f => f.id === pokemon.id);
    if (idx > -1) {
      arenaFighters.splice(idx, 1);
      showStatus(`${pokemon.name} retirado de la arena.`);
    } else {
      if (arenaFighters.length >= 2) {
        showStatus('La arena solo admite 2 Pokémon. Quita uno primero.', true);
        setTimeout(hideStatus, 2000);
        return;
      }
      arenaFighters.push(pokemon);
      showStatus(`¡${pokemon.name} entra a la Arena de Combate! ⚔️`);
    }
    setTimeout(hideStatus, 1500);
    updateArenaUI();
  }

  window.removeFighter = function (index) {
    if (arenaFighters[index]) {
      arenaFighters.splice(index, 1);
      updateArenaUI();
    }
  };

  function simulateBattle() {
    if (arenaFighters.length !== 2) return;
    const [pA, pB] = arenaFighters;
    const cpA = totalCP(pA);
    const cpB = totalCP(pB);

    let winnerText = '';
    if (cpA > cpB) winnerText = `🏆 ¡${pA.name.toUpperCase()} GANA EL COMBATE!`;
    else if (cpB > cpA) winnerText = `🏆 ¡${pB.name.toUpperCase()} GANA EL COMBATE!`;
    else winnerText = '⚖️ ¡EMPATE TÉCNICO EN LA ARENA!';

    if ($battleVerdict) {
      $battleVerdict.style.display = 'block';

      const statNames = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
      const rowsHtml = statNames.map(st => {
        const valA = pA.stats?.find(s => (s.stat?.name || s.name) === st)?.base_stat || pA.stats?.find(s => s.name === st)?.value || 0;
        const valB = pB.stats?.find(s => (s.stat?.name || s.name) === st)?.base_stat || pB.stats?.find(s => s.name === st)?.value || 0;
        const widthA = Math.min(100, Math.round((valA / 180) * 100));
        const widthB = Math.min(100, Math.round((valB / 180) * 100));

        return `
          <div class="battle-stat-row">
            <b style="text-align:right;color:${valA >= valB ? 'var(--poke-yellow)' : 'var(--text-muted)'}">${valA}</b>
            <div class="stat-bar-box"><div class="stat-bar-fill-a" style="width:${widthA}%"></div></div>
            <span class="battle-stat-name">${st.replace('special-', 's.').replace('hp', 'ps')}</span>
            <div class="stat-bar-box"><div class="stat-bar-fill-b" style="width:${widthB}%"></div></div>
            <b style="color:${valB >= valA ? 'var(--poke-cyan)' : 'var(--text-muted)'}">${valB}</b>
          </div>
        `;
      }).join('');

      $battleVerdict.innerHTML = `
        <div class="verdict-winner-badge">
          <h3>${winnerText}</h3>
          <p style="color:var(--text-muted);font-size:.88rem">Comparativa de Poder Total: <b>${pA.name} (${cpA} CP)</b> vs <b>${pB.name} (${cpB} CP)</b></p>
        </div>
        <div class="battle-stats-compare-grid">
          ${rowsHtml}
        </div>
      `;

      if (window.gsap) {
        gsap.fromTo('#battleVerdict',
          { y: 20, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out', clearProps: 'opacity,transform' }
        );
      }
      playCry(cpA >= cpB ? pA.id : pB.id);
    }
  }

  if ($doBattleBtn) $doBattleBtn.addEventListener('click', simulateBattle);
  if ($clearCompareBtn) $clearCompareBtn.addEventListener('click', () => { arenaFighters = []; updateArenaUI(); });
  if ($goToArenaBtn) $goToArenaBtn.addEventListener('click', () => {
    document.getElementById('arena')?.scrollIntoView({ behavior: 'smooth' });
  });

  // 6. MI EQUIPO DE 6 POKÉMON (Liga Pokémon)
  function renderTeamBelt() {
    if (!$teamBeltGrid) return;
    $teamBeltGrid.innerHTML = '';

    for (let i = 0; i < 6; i++) {
      const member = myTeam[i];
      const slot = document.createElement('div');
      slot.className = `team-ball-slot ${member ? 'occupied' : ''}`;

      if (member) {
        slot.innerHTML = `
          <button class="btn-remove-team-member" onclick="window.removeTeamMember(${member.id})" title="Quitar">✕</button>
          <img src="${member.sprite}" alt="${member.name}">
          <b>${member.name}</b>
          <span style="font-size:.65rem;color:var(--poke-cyan);font-weight:800">CP ${member.cp}</span>
        `;
        slot.addEventListener('click', (e) => {
          if (!e.target.classList.contains('btn-remove-team-member')) {
            openHoloScan(member.id);
          }
        });
      } else {
        slot.innerHTML = `
          <div class="empty-ball-icon">⚡</div>
          <span style="font-size:.72rem;color:var(--text-muted);font-weight:700">Ranura ${i + 1}</span>
        `;
      }
      $teamBeltGrid.appendChild(slot);
    }

    // Actualizar Estadísticas del Equipo
    const count = myTeam.length;
    if ($teamBadgeTop) $teamBadgeTop.textContent = `${count}/6`;
    if ($teamCountSummary) $teamCountSummary.textContent = `${count} / 6`;

    const avgCP = count ? Math.round(myTeam.reduce((sum, m) => sum + m.cp, 0) / count) : 0;
    if ($teamAverageCP) $teamAverageCP.textContent = `${avgCP} pts`;

    const uniqueTypes = new Set(myTeam.flatMap(m => m.types || []));
    if ($teamTypesCovered) $teamTypesCovered.textContent = `${uniqueTypes.size} tipos`;

    localStorage.setItem(TEAM_KEY, JSON.stringify(myTeam));
  }

  function toggleTeamMember(pokemonData) {
    const idx = myTeam.findIndex(m => m.id === pokemonData.id);
    if (idx > -1) {
      myTeam.splice(idx, 1);
      showStatus(`⚡ ${pokemonData.name} removido de tu equipo.`);
    } else {
      if (myTeam.length >= 6) {
        showStatus('¡Tu equipo ya tiene 6 Pokémon! Elige uno para reemplazar.', true);
        setTimeout(hideStatus, 2000);
        return;
      }
      myTeam.push(pokemonData);
      showStatus(`⚡ ¡${pokemonData.name} se unió a tu equipo para la Liga!`);
    }
    setTimeout(hideStatus, 1500);
    renderTeamBelt();
  }

  window.removeTeamMember = function (id) {
    myTeam = myTeam.filter(m => m.id !== id);
    renderTeamBelt();
    showStatus('Pokémon removido del equipo.');
    setTimeout(hideStatus, 1200);
  };

  if ($clearTeamBtn) {
    $clearTeamBtn.addEventListener('click', () => {
      if (!myTeam.length) return;
      if (confirm('¿Deseas vaciar tu equipo de 6 Pokémon?')) {
        myTeam = [];
        renderTeamBelt();
        showStatus('Equipo vaciado.');
        setTimeout(hideStatus, 1200);
      }
    });
  }

  if ($exportTeamBtn) {
    $exportTeamBtn.addEventListener('click', () => {
      if (!myTeam.length) {
        showStatus('No hay Pokémon en tu equipo para exportar.', true);
        setTimeout(hideStatus, 1500);
        return;
      }
      const lines = myTeam.map((m, idx) => `[Slot ${idx + 1}] #${pad3(m.id)} ${m.name.toUpperCase()} | Tipos: ${m.types.join('/')} | CP: ${m.cp}`);
      const text = `FICHA OFICIAL DE ENTRENADOR POKÉMON\nPokédex NEO LAB - ${new Date().toLocaleDateString()}\n----------------------------------------\nIntegrantes: ${myTeam.length}/6\n\n${lines.join('\n')}\n\n¡Listo para desafiar a la Liga Pokémon!`;
      
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `equipo-pokemon-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      showStatus('¡Ficha de entrenador exportada en .txt! 📄');
      setTimeout(hideStatus, 1500);
    });
  }

  // 7. MODAL HOLO-SCAN
  let isShinyHolo = false;
  let lastFocusedElement = null; // Para restaurar el foco al cerrar el modal
  async function openHoloScan(idOrName) {
    if (!$modalBackdrop || !$modal) return;
    isShinyHolo = false;
    lastFocusedElement = document.activeElement;
    $modalBackdrop.classList.add('open');
    $modalBackdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    $modal.innerHTML = '<div style="padding:3rem;text-align:center;color:var(--poke-yellow)">Escaneando frecuencia biológica con PokeAPI...</div>';

    try {
      const p = await ApiClient.getPokemonDetail(idOrName);
      const sprNormal = p.sprites.normal;
      const sprShiny = p.sprites.shiny;
      const types = p.types.map(t => `<span class="badge type-${t}">${t}</span>`).join('');
      const abilities = p.abilities.map(a => `<span class="badge" style="background:var(--surface-2);color:var(--text-main)">${a.name}${a.is_hidden ? ' (Oculta)' : ''}</span>`).join('');

      $modal.innerHTML = `
        <button class="modal-close-btn" id="closeHoloBtn" aria-label="Cerrar Escáner">✕</button>
        <div class="holo-hero-grid">
          <div class="holo-art-screen" id="holoArtScreen">
            <img id="holoModalImg" src="${sprNormal}" alt="${p.name}">
            <div class="shiny-switch-box">
              <button class="shiny-switch-btn active" id="holoBtnNormal">Normal</button>
              <button class="shiny-switch-btn is-shiny" id="holoBtnShiny">✨ Shiny</button>
            </div>
          </div>
          <div class="holo-info-column">
            <div class="holo-kicker">PokeAPI Escáner Oficial · #${pad3(p.id)}</div>
            <h2 class="holo-name">${p.name}</h2>
            <div style="font-size:.85rem;color:var(--poke-yellow);font-weight:700">${p.genus}</div>
            <div style="display:flex;gap:6px;margin:.3rem 0">${types}</div>
            <div class="holo-desc-box">${p.description}</div>
            <div style="display:flex;gap:.6rem;flex-wrap:wrap;font-size:.78rem;font-weight:700">
              <span class="badge" style="background:rgba(0,0,0,.3)">📏 ${(p.height / 10).toFixed(1)} m</span>
              <span class="badge" style="background:rgba(0,0,0,.3)">⚖️ ${(p.weight / 10).toFixed(1)} kg</span>
              <span class="badge" style="background:rgba(0,0,0,.3)">🌲 Hábitat: ${p.habitat}</span>
              <button id="holoCryBtn" class="btn-sound" style="padding:.2rem .6rem">🔊 Escuchar Grito</button>
            </div>
          </div>
        </div>
        <div class="holo-stats-section">
          <div class="holo-stats-title">📊 Estadísticas Base de Combate</div>
          <div class="holo-stat-grid">
            ${p.stats.map(s => `
              <div class="holo-stat-item">
                <span>${s.name.replace('special-', 's.').replace('hp', 'ps')}</span>
                <div class="holo-bar-bg"><div class="holo-bar-fill" style="width:${Math.min(100, Math.round(s.value / 1.6))}%"></div></div>
                <b>${s.value}</b>
              </div>
            `).join('')}
          </div>
          <div style="margin-top:1.2rem">
            <div style="font-size:.82rem;font-weight:800;color:var(--text-muted);margin-bottom:.4rem">HABILIDADES:</div>
            <div style="display:flex;gap:6px;flex-wrap:wrap">${abilities}</div>
          </div>
        </div>
      `;

      // Eventos del Modal
      document.getElementById('closeHoloBtn')?.addEventListener('click', closeHoloScan);
      document.getElementById('holoCryBtn')?.addEventListener('click', () => playCry(p.id));

      const imgEl = document.getElementById('holoModalImg');
      const btnN = document.getElementById('holoBtnNormal');
      const btnS = document.getElementById('holoBtnShiny');

      btnN?.addEventListener('click', () => {
        isShinyHolo = false;
        imgEl.src = sprNormal;
        btnN.classList.add('active');
        btnS.classList.remove('active');
      });

      btnS?.addEventListener('click', () => {
        isShinyHolo = true;
        imgEl.src = sprShiny;
        btnS.classList.add('active');
        btnN.classList.remove('active');
      });

      if (window.gsap) {
        gsap.fromTo($modal, { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(1.4)', clearProps: 'opacity,transform' });
      }

      // El foco pasa al botón de cierre para navegación por teclado
      document.getElementById('closeHoloBtn')?.focus();
    } catch (e) {
      $modal.innerHTML = '<div style="padding:2rem;text-align:center">Error cargando información de la Pokédex.</div>';
    }
  }

  function closeHoloScan() {
    if (!$modalBackdrop) return;
    if (!$modalBackdrop.classList.contains('open')) return;
    $modalBackdrop.classList.remove('open');
    $modalBackdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    // Restaurar el foco al elemento que abrió el modal
    if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
      lastFocusedElement.focus();
    }
    lastFocusedElement = null;
  }

  if ($modalBackdrop) {
    $modalBackdrop.addEventListener('click', (e) => {
      if (e.target === $modalBackdrop) closeHoloScan();
    });

    // Focus trap básico: el Tab no sale del modal mientras está abierto
    $modalBackdrop.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const focusables = $modalBackdrop.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  // 8. BÚSQUEDA Y EVENTOS
  function bindEvents() {
    const handleSearch = debounce(() => {
      searchTerm = $searchInput.value.trim();
      visibleCount = PAGE_SIZE;
      applyFilters();
    }, 250);

    if ($searchInput) {
      $searchInput.addEventListener('input', handleSearch);
      $searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          searchTerm = $searchInput.value.trim();
          applyFilters();
        }
        if (e.key === 'Escape') {
          $searchInput.value = '';
          searchTerm = '';
          applyFilters();
        }
      });
    }

    if ($searchBtn) {
      $searchBtn.addEventListener('click', () => {
        searchTerm = $searchInput.value.trim();
        applyFilters();
      });
    }

    if ($genSelect) {
      $genSelect.addEventListener('change', (e) => {
        currentGen = e.target.value;
        loadPokedexData();
      });
    }

    if ($sortSelect) {
      $sortSelect.addEventListener('change', (e) => {
        sortBy = e.target.value;
        applyFilters();
      });
    }

    if ($loadMore) {
      $loadMore.addEventListener('click', () => {
        visibleCount += PAGE_SIZE;
        renderGrid(filteredList);
      });
    }

    // Infinite Scroll
    if ($sentinel) {
      if (observer) observer.disconnect();
      observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && filteredList.length > visibleCount && !isLoading) {
          visibleCount += PAGE_SIZE;
          renderGrid(filteredList);
        }
      }, { rootMargin: '400px 0px' });
      observer.observe($sentinel);
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeHoloScan();
    });

    // Menú móvil: desplegable de navegación en pantallas pequeñas
    const $menuToggle = document.getElementById('menuToggle');
    const $nav = document.getElementById('pokedexNav');
    if ($menuToggle && $nav) {
      const closeMobileNav = () => {
        $nav.classList.remove('open');
        $menuToggle.setAttribute('aria-expanded', 'false');
        $menuToggle.setAttribute('aria-label', 'Abrir menú de navegación');
        $menuToggle.textContent = '☰';
      };

      $menuToggle.addEventListener('click', () => {
        const open = $nav.classList.toggle('open');
        $menuToggle.setAttribute('aria-expanded', String(open));
        $menuToggle.setAttribute('aria-label', open ? 'Cerrar menú de navegación' : 'Abrir menú de navegación');
        $menuToggle.textContent = open ? '✕' : '☰';
      });

      // Al navegar a una sección, el desplegable se cierra
      $nav.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', closeMobileNav);
      });
    }
  }

  // 9. VERIFICACIÓN DE ESTADO DEL BACKEND
  async function checkBackendConnection() {
    const online = await ApiClient.checkBackend();
    if ($backendBadge) {
      if (online) {
        $backendBadge.textContent = '🟢 Backend Express Activo';
        $backendBadge.style.color = '#2ecc71';
        $backendBadge.style.borderColor = '#2ecc71';
      } else {
        $backendBadge.textContent = '⚡ PokeAPI Directa (Fallback)';
        $backendBadge.style.color = 'var(--poke-yellow)';
        $backendBadge.style.borderColor = 'var(--poke-yellow)';
      }
    }
  }

  // 10. INICIALIZACIÓN
  function init() {
    initTheme();
    buildTypeFilters();
    bindEvents();
    renderTeamBelt();
    updateArenaUI();
    checkBackendConnection();
    loadFeaturedPokemon();
    loadTrivia();
    loadPokedexData();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
