require('dotenv').config();
const express = require('express');
const cors = require('cors');
const pokemonRoutes = require('./routes/pokemon.routes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Logger simple para peticiones
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.originalUrl}`);
  next();
});

// Rutas de la API
app.use('/api', pokemonRoutes);

// Ruta raíz de verificación
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    project: 'Pokédex NEO LAB Backend API',
    endpoints: [
      'GET /api/pokemon?gen=1&limit=24&type=fire&search=char',
      'GET /api/pokemon/:idOrName',
      'GET /api/trivia',
      'GET /api/team',
      'POST /api/team'
    ]
  });
});

// Manejador de 404
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Ruta no encontrada' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`=========================================`);
  console.log(`🚀 Pokédex Backend corriendo en: http://localhost:${PORT}`);
  console.log(`⚡ API Endpoints: http://localhost:${PORT}/api/pokemon`);
  console.log(`=========================================`);
});
