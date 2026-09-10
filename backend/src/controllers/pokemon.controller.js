const PokeApiService = require('../services/pokeapi.service');

// Memoria volátil para el equipo de 6 Pokémon de la Liga (persistible por cliente/sesión)
let userTeam = [];

const PokemonController = {
  // GET /api/pokemon?gen=1&limit=24&offset=0&type=fire&search=pika
  async getPokemons(req, res) {
    try {
      const { gen = '1', limit, offset = '0', type, search } = req.query;
      const range = PokeApiService.GEN_RANGES[gen] || PokeApiService.GEN_RANGES['1'];
      const [start, end] = range;

      let pokemons = await PokeApiService.getPokemonsByRange(start, end);

      // Filtro por tipo si se solicita
      if (type && type !== 'all') {
        pokemons = pokemons.filter(p =>
          p.types && p.types.some(t => t.type.name.toLowerCase() === type.toLowerCase())
        );
      }

      // Filtro por búsqueda de nombre o ID
      if (search) {
        const query = search.toLowerCase().trim();
        pokemons = pokemons.filter(p =>
          p.name.toLowerCase().includes(query) ||
          String(p.id) === query ||
          String(p.id).padStart(3, '0').includes(query)
        );
      }

      const total = pokemons.length;
      const off = parseInt(offset, 10) || 0;
      const lim = limit ? parseInt(limit, 10) : total;
      const paginated = pokemons.slice(off, off + lim);

      res.json({
        success: true,
        gen,
        total,
        count: paginated.length,
        offset: off,
        results: paginated
      });
    } catch (error) {
      console.error('Error in getPokemons:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/pokemon/:idOrName
  async getPokemonDetail(req, res) {
    try {
      const { idOrName } = req.params;
      const [pokemon, species] = await Promise.all([
        PokeApiService.getPokemonById(idOrName),
        PokeApiService.getSpeciesById(idOrName).catch(() => null)
      ]);

      let esFlavorText = 'Información no disponible.';
      let genus = 'Pokémon';
      let habitat = 'Desconocido';

      if (species) {
        const esEntry = species.flavor_text_entries?.find(e => e.language.name === 'es') ||
                        species.flavor_text_entries?.find(e => e.language.name === 'en');
        if (esEntry) esFlavorText = esEntry.flavor_text.replace(/\f/g, ' ').replace(/\n/g, ' ');

        const genusEntry = species.genera?.find(g => g.language.name === 'es') ||
                           species.genera?.find(g => g.language.name === 'en');
        if (genusEntry) genus = genusEntry.genus;

        habitat = species.habitat?.name || 'Desconocido';
      }

      const cryUrl = `https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/${pokemon.id}.ogg`;

      res.json({
        success: true,
        data: {
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
            shiny: pokemon.sprites?.other?.['official-artwork']?.front_shiny || pokemon.sprites?.front_shiny,
            icon: pokemon.sprites?.versions?.['generation-viii']?.icons?.front_default || pokemon.sprites?.front_default
          },
          cry: cryUrl
        }
      });
    } catch (error) {
      console.error('Error in getPokemonDetail:', error);
      res.status(404).json({ success: false, error: 'Pokémon no encontrado' });
    }
  },

  // GET /api/trivia
  async getTrivia(req, res) {
    try {
      const trivia = await PokeApiService.getRandomPokemonForTrivia();
      res.json({ success: true, data: trivia });
    } catch (error) {
      console.error('Error in getTrivia:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  },

  // GET /api/team
  async getTeam(req, res) {
    res.json({ success: true, team: userTeam });
  },

  // POST /api/team
  async updateTeam(req, res) {
    const { team } = req.body;
    if (Array.isArray(team) && team.length <= 6) {
      userTeam = team;
      return res.json({ success: true, message: 'Equipo actualizado', team: userTeam });
    }
    res.status(400).json({ success: false, error: 'El equipo debe tener un arreglo de máximo 6 Pokémon' });
  }
};

module.exports = PokemonController;
