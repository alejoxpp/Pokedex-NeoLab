const express = require('express');
const router = express.Router();
const PokemonController = require('../controllers/pokemon.controller');

// Rutas de Pokémon
router.get('/pokemon', PokemonController.getPokemons);
router.get('/pokemon/:idOrName', PokemonController.getPokemonDetail);
router.get('/trivia', PokemonController.getTrivia);
router.get('/team', PokemonController.getTeam);
router.post('/team', PokemonController.updateTeam);

module.exports = router;
