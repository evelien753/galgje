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

  socket.on('createGame', (playerName) => {
    const gameId = Math.random().toString(36).substring(2, 7);
    games[gameId] = {
      creator: socket.id,
      players: [{ id: socket.id, name: playerName, disconnected: false }],
      secretWord: null,
      word: '',
      correctGuesses: [],
      incorrectGuesses: [],
      isGameOver: false,
      isWinner: false,
    };
    socket.join(gameId);
    socket.emit('gameCreated', gameId);
    io.to(gameId).emit('gameUpdate', games[gameId]);
    console.log(`Game created with ID: ${gameId} by ${playerName} (${socket.id})`);
  });

  socket.on('joinGame', ({ gameId, playerName }) => {
    if (games[gameId]) {
      const existingPlayer = games[gameId].players.find(p => p.name === playerName);
      if (!existingPlayer) {
        games[gameId].players.push({ id: socket.id, name: playerName, disconnected: false });
      }
      socket.join(gameId);
      console.log(`${playerName} (${socket.id}) joined game ${gameId}`);
      io.to(gameId).emit('gameUpdate', games[gameId]);
    } else {
      socket.emit('gameNotFound');
    }
  });

  socket.on('reconnectGame', ({ gameId, playerName }) => {
    const game = games[gameId];
    if (game) {
        const player = game.players.find(p => p.name === playerName);
        if (player) {
            player.id = socket.id; // Update socket ID
            player.disconnected = false;
            socket.join(gameId);
            console.log(`Player ${playerName} reconnected to game ${gameId} with new socket ID ${socket.id}`);
            io.to(gameId).emit('gameUpdate', game);
        } else {
            socket.emit('reconnectFailed');
        }
    } else {
        socket.emit('reconnectFailed');
    }
  });

  socket.on('setWord', ({ gameId, word }) => {
    const game = games[gameId];
    if (game && game.creator === socket.id) {
      game.secretWord = word.toLowerCase();
      game.word = createWordDisplay(game.secretWord, game.correctGuesses);
      console.log(`Word set for game ${gameId}: ${game.secretWord}`);
      io.to(gameId).emit('gameUpdate', game);
    }
  });

  socket.on('makeGuess', ({ gameId, letter }) => {
    const game = games[gameId];
    if (!game || game.isGameOver || game.creator === socket.id) return;

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
    const hasLost = game.incorrectGuesses.length >= 10;

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

  socket.on('leaveGame', ({ gameId, playerName }) => {
    const game = games[gameId];
    if (game) {
        game.players = game.players.filter(p => p.name !== playerName);
        console.log(`Player ${playerName} manually left game ${gameId}`);
        if (game.players.length === 0) {
            delete games[gameId];
            console.log(`Game ${gameId} deleted.`);
        } else {
            io.to(gameId).emit('gameUpdate', game);
        }
    }
  });

  socket.on('disconnect', () => {
    console.log('user disconnected:', socket.id);
    for (const gameId in games) {
      const game = games[gameId];
      const player = game.players.find(p => p.id === socket.id);
      if (player) {
        console.log(`Player ${player.name} disconnected from game ${gameId}`);
        player.disconnected = true;
        // We don't emit a game update here to avoid constant updates on brief disconnects.
        // The game state will be updated when the player reconnects or another action happens.
        // A timeout could be set here to remove the player permanently after a while.
      }
    }
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
