/**
 * API CLIENT - POKEDEX NEO LAB
 * Conexión hacia el Backend Proxy en Node.js (http://localhost:3000/api)
 * con Fallback inteligente a PokeAPI oficial si el backend está apagado.
 */

const API_CONFIG = {
  BACKEND_URL: 'http://localhost:3000/api',
  POKEAPI_BASE: 'https://pokeapi.co/api/v2',
  GEN_RANGES: {
    '1': [1, 151],
    '2': [152, 251],
    '3': [252, 386],
    '4': [387, 493],
    '5': [494, 649],
    '6': [650, 721],
    '7': [722, 809],
    '8': [810, 898],
    '9': [899, 1010],
    'all': [1, 1025]
  }
};

let isBackendAvailable = null; // null: no verificado, true: online, false: fallback

const ApiClient = {
  async checkBackend() {
    if (isBackendAvailable !== null) return isBackendAvailable;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(`${API_CONFIG.BACKEND_URL}/pokemon?gen=1&limit=1`, {
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      isBackendAvailable = res.ok;
    } catch {
      isBackendAvailable = false;
    }
    console.log(`[API Client] Modo de conexión: ${isBackendAvailable ? '🟢 Backend Express' : '⚡ PokeAPI Directa (Fallback)'}`);
    return isBackendAvailable;
  },

  // Obtener lista por generación
  async getPokemonList({ gen = '1', type = 'all', search = '', limit = 1025, offset = 0 } = {}) {
    const backendOnline = await this.checkBackend();

    if (backendOnline) {
      try {
        const queryParams = new URLSearchParams({ gen, type, search, limit, offset });
        const res = await fetch(`${API_CONFIG.BACKEND_URL}/pokemon?${queryParams}`);
        if (res.ok) {
          const data = await res.json();
          return data.results || [];
        }
      } catch (e) {
        console.warn('Fallo backend temporal, recurriendo a PokeAPI directa', e);
      }
    }

    // Fallback: Consumo directo de PokeAPI
    const [start, end] = API_CONFIG.GEN_RANGES[gen] || API_CONFIG.GEN_RANGES['1'];
    const total = end - start + 1;
    const urls = Array.from({ length: total }, (_, i) => `${API_CONFIG.POKEAPI_BASE}/pokemon/${start + i}`);

    const results = new Array(urls.length);
    let idx = 0;
    const concurrency = 18;

    async function worker() {
      while (idx < urls.length) {
        const c = idx++;
        try {
          const r = await fetch(urls[c]);
          results[c] = await r.json();
        } catch {
          const id = start + c;
          results[c] = {
            id,
            name: `pokemon-${id}`,
            sprites: { front_default: '' },
            types: [{ type: { name: 'normal' } }],
            stats: [],
            height: 0,
            weight: 0
          };
        }
      }
    }

    const workers = Array.from({ length: Math.min(concurrency, urls.length) }, () => worker());
    await Promise.all(workers);
    return results.sort((a, b) => a.id - b.id);
  },

  // Detalle enriquecido
  async getPokemonDetail(idOrName) {
    const backendOnline = await this.checkBackend();

    if (backendOnline) {
      try {
        const res = await fetch(`${API_CONFIG.BACKEND_URL}/pokemon/${idOrName}`);
        if (res.ok) {
          const data = await res.json();
          return data.data;
        }
      } catch (e) {
        console.warn('Fallo backend al obtener detalle, usando PokeAPI', e);
      }
    }

    // Fallback directo
    const [pokemon, species] = await Promise.all([
      fetch(`${API_CONFIG.POKEAPI_BASE}/pokemon/${String(idOrName).toLowerCase()}`).then(r => r.json()),
      fetch(`${API_CONFIG.POKEAPI_BASE}/pokemon-species/${String(idOrName).toLowerCase()}`).then(r => r.json()).catch(() => null)
    ]);

    let esFlavorText = 'Pokémon detectado en la Pokédex.';
    let genus = 'Pokémon';
    let habitat = 'Desconocido';

    if (species) {
      const entry = species.flavor_text_entries?.find(e => e.language.name === 'es') ||
                    species.flavor_text_entries?.find(e => e.language.name === 'en');
      if (entry) esFlavorText = entry.flavor_text.replace(/\f/g, ' ').replace(/\n/g, ' ');

      const genusEntry = species.genera?.find(g => g.language.name === 'es') ||
                         species.genera?.find(g => g.language.name === 'en');
      if (genusEntry) genus = genusEntry.genus;
      habitat = species.habitat?.name || 'Desconocido';
    }

    return {
      id: pokemon.id,
      name: pokemon.name,
      genus,
      description: esFlavorText,
      habitat,
      height: pokemon.height,
      weight: pokemon.weight,
      base_experience: pokemon.base_experience,
      types: pokemon.types.map(t => t.type.name),
      stats: pokemon.stats.map(s => ({
        name: s.stat.name,
        value: s.base_stat
      })),
      abilities: pokemon.abilities.map(a => ({
        name: a.ability.name,
        is_hidden: a.is_hidden
      })),
      sprites: {
        normal: pokemon.sprites?.other?.['official-artwork']?.front_default || pokemon.sprites?.front_default,
        shiny: pokemon.sprites?.other?.['official-artwork']?.front_shiny || pokemon.sprites?.front_shiny
      },
      cry: `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${pokemon.id}.ogg`
    };
  },

  // Trivia "¿Quién es este Pokémon?"
  async getTrivia() {
    const backendOnline = await this.checkBackend();
    if (backendOnline) {
      try {
        const res = await fetch(`${API_CONFIG.BACKEND_URL}/trivia`);
        if (res.ok) {
          const data = await res.json();
          return data.data;
        }
      } catch (e) {
        console.warn('Fallo backend trivia, calculando en cliente', e);
      }
    }

    // Fallback cliente
    const randomId = Math.floor(Math.random() * 151) + 1; // Gen 1 rápida para trivia
    const detail = await this.getPokemonDetail(randomId);

    const options = [detail.name];
    const dummyNames = ['pikachu', 'charizard', 'bulbasaur', 'squirtle', 'gengar', 'mewtwo', 'eevee', 'snorlax', 'lucario', 'greninja', 'gyarados', 'dragonite', 'jigglypuff'];
    
    while (options.length < 4) {
      const pick = dummyNames[Math.floor(Math.random() * dummyNames.length)];
      if (!options.includes(pick)) options.push(pick);
    }
    options.sort(() => Math.random() - 0.5);

    return {
      id: detail.id,
      name: detail.name,
      sprite: detail.sprites.normal,
      shinySprite: detail.sprites.shiny,
      cryUrl: detail.cry,
      flavorText: detail.description,
      types: detail.types,
      options
    };
  }
};

window.ApiClient = ApiClient;
