const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const games = {};

function createWordDisplay(secretWord, correctGuesses) {
    return secretWord.split('').map(letter => (correctGuesses.includes(letter) ? letter : '_')).join(' ');
}

io.on('connection', (socket) => {
  console.log('a user connected:', socket.id);

  socket.on('createGame', () => {
    const gameId = Math.random().toString(36).substring(2, 7);
    games[gameId] = {
      creator: socket.id,
      players: [socket.id],
      secretWord: null,
      word: '',
      correctGuesses: [],
      incorrectGuesses: [],
      isGameOver: false,
      isWinner: false,
    };
    socket.join(gameId);
    socket.emit('gameCreated', gameId);
    console.log(`Game created with ID: ${gameId} by ${socket.id}`);
  });

  socket.on('joinGame', (gameId) => {
    if (games[gameId]) {
      games[gameId].players.push(socket.id);
      socket.join(gameId);
      console.log(`${socket.id} joined game ${gameId}`);
      io.to(gameId).emit('gameUpdate', games[gameId]);
    } else {
      socket.emit('gameNotFound');
    }
  });

  socket.on('setWord', ({ gameId, word }) => {
    const game = games[gameId];
    if (game && game.creator === socket.id) {
      game.secretWord = word.toLowerCase();
      game.word = createWordDisplay(game.secretWord, game.correctGuesses);
      console.log(`Word set for game ${gameId}: ${game.secretWord}`);
      socket.emit('wordIsSet'); // Notify creator
      // Notify others, but without the secret word
      const publicGameState = { ...game, secretWord: '' };
      socket.to(gameId).emit('gameUpdate', publicGameState);
    }
  });

  socket.on('makeGuess', ({ gameId, letter }) => {
    const game = games[gameId];
    if (!game || game.isGameOver) return;

    letter = letter.toLowerCase();
    const isAlreadyGuessed = game.correctGuesses.includes(letter) || game.incorrectGuesses.includes(letter);
    if (isAlreadyGuessed) return;

    if (game.secretWord.includes(letter)) {
      game.correctGuesses.push(letter);
    } else {
      game.incorrectGuesses.push(letter);
    }

    game.word = createWordDisplay(game.secretWord, game.correctGuesses);

    const isWordGuessed = !game.word.includes('_');
    const hasLost = game.incorrectGuesses.length >= 6;

    if (isWordGuessed) {
      game.isGameOver = true;
      game.isWinner = true;
    }
    if (hasLost) {
      game.isGameOver = true;
      game.isWinner = false;
    }

    io.to(gameId).emit('gameUpdate', game);
  });

  socket.on('disconnect', () => {
    console.log('user disconnected:', socket.id);
    // Optional: Handle player leaving a game
  });
});

// Fallback to index.html for single-page application
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});