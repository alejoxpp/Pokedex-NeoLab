const POKEAPI_BASE = process.env.POKEAPI_BASE_URL || 'https://pokeapi.co/api/v2';
const CACHE_TTL = parseInt(process.env.CACHE_TTL_MS || '86400000', 10);

// Simple memoria caché en servidor
const cache = new Map();

function getCached(key) {
  const item = cache.get(key);
  if (!item) return null;
  if (Date.now() - item.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return item.data;
}

function setCache(key, data) {
  cache.set(key, { timestamp: Date.now(), data });
}

async function fetchJson(url) {
  const cached = getCached(url);
  if (cached) return cached;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`PokeAPI error status ${res.status} para ${url}`);
  }
  const data = await res.json();
  setCache(url, data);
  return data;
}

const PokeApiService = {
  // Rango por generación
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
  },

  async getPokemonById(idOrName) {
    const url = `${POKEAPI_BASE}/pokemon/${String(idOrName).toLowerCase()}`;
    return await fetchJson(url);
  },

  async getSpeciesById(idOrName) {
    const url = `${POKEAPI_BASE}/pokemon-species/${String(idOrName).toLowerCase()}`;
    return await fetchJson(url);
  },

  async getPokemonsByRange(start, end, limit = 20, concurrency = 15) {
    const total = end - start + 1;
    const urls = Array.from({ length: total }, (_, i) => `${POKEAPI_BASE}/pokemon/${start + i}`);

    const results = new Array(urls.length);
    let index = 0;

    async function worker() {
      while (index < urls.length) {
        const i = index++;
        try {
          results[i] = await fetchJson(urls[i]);
        } catch (err) {
          const id = start + i;
          results[i] = {
            id,
            name: `pokemon-${id}`,
            sprites: { front_default: '' },
            types: [],
            stats: [],
            height: 0,
            weight: 0,
            abilities: []
          };
        }
      }
    }

    const workers = Array.from({ length: Math.min(concurrency, urls.length) }, () => worker());
    await Promise.all(workers);
    return results;
  },

  async getRandomPokemonForTrivia() {
    // Generar un ID aleatorio de Gen 1-9 (1 a 1025)
    const randomId = Math.floor(Math.random() * 1025) + 1;
    const [pokemon, species] = await Promise.all([
      this.getPokemonById(randomId),
      this.getSpeciesById(randomId).catch(() => null)
    ]);

    let esFlavorText = 'Pokémon misterioso detectado por el escáner Pokédex.';
    if (species && species.flavor_text_entries) {
      const entry = species.flavor_text_entries.find(e => e.language.name === 'es') ||
                    species.flavor_text_entries.find(e => e.language.name === 'en');
      if (entry) {
        esFlavorText = entry.flavor_text.replace(/\f/g, ' ').replace(/\n/g, ' ');
      }
    }

    // 3 opciones incorrectas aleatorias
    const options = [pokemon.name];
    while (options.length < 4) {
      const fakeId = Math.floor(Math.random() * 1025) + 1;
      if (fakeId !== randomId) {
        try {
          const fakeMon = await this.getPokemonById(fakeId);
          if (fakeMon && fakeMon.name && !options.includes(fakeMon.name)) {
            options.push(fakeMon.name);
          }
        } catch {}
      }
    }

    // Mezclar opciones
    options.sort(() => Math.random() - 0.5);

    return {
      id: pokemon.id,
      name: pokemon.name,
      sprite: pokemon.sprites?.other?.['official-artwork']?.front_default || pokemon.sprites?.front_default,
      shinySprite: pokemon.sprites?.other?.['official-artwork']?.front_shiny || pokemon.sprites?.front_shiny,
      cryUrl: `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${pokemon.id}.ogg`,
      flavorText: esFlavorText,
      types: pokemon.types.map(t => t.type.name),
      options
    };
  }
};

module.exports = PokeApiService;
