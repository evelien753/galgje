const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());

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

// Functie om de beurt door te geven aan de volgende actieve speler
function advanceTurn(game) {
    if (game.players.length < 2) {
        game.currentPlayerIndex = 0; // Alleen de creator is over
        return;
    }

    let nextIndex = game.currentPlayerIndex;
    const originalIndex = game.currentPlayerIndex;

    do {
        nextIndex = (nextIndex + 1) % game.players.length;
        // Sla de creator (index 0) altijd over in de normale beurt-rotatie
        if (nextIndex === 0) {
            nextIndex = 1;
        }
    } while (game.players[nextIndex].disconnected && nextIndex !== originalIndex);
    
    // Als we de hele cirkel hebben doorlopen en iedereen is disconnected, doe niets
    if (nextIndex === originalIndex && game.players[nextIndex].disconnected) {
        return;
    }

    game.currentPlayerIndex = nextIndex;
    console.log(`[Game ${game.id}] Advanced turn to player ${game.players[game.currentPlayerIndex].name}`);
}

io.on('connection', (socket) => {
  console.log('a user connected:', socket.id);

  socket.on('createGame', (playerName) => {
    const gameId = Math.random().toString(36).substring(2, 7);
    games[gameId] = {
      id: gameId,
      creator: socket.id,
      players: [{ id: socket.id, name: playerName, disconnected: false }],
      secretWord: null,
      word: '',
      correctGuesses: [],
      incorrectGuesses: [],
      isGameOver: false,
      isWinner: false,
      currentPlayerIndex: 0, // Creator is op index 0
    };
    socket.join(gameId);
    socket.emit('gameCreated', gameId);
    io.to(gameId).emit('gameUpdate', games[gameId]);
    console.log(`Game created with ID: ${gameId} by ${playerName} (${socket.id})`);
  });

  socket.on('joinGame', ({ gameId, playerName }) => {
    const game = games[gameId];
    if (game) {
      let player = game.players.find(p => p.name === playerName);
      if (!player) {
        player = { id: socket.id, name: playerName, disconnected: false };
        game.players.push(player);
      }

      // Als het spel al bezig was en de creator was de enige actieve speler,
      // maak de nieuwe speler de actieve speler.
      if (game.secretWord && game.currentPlayerIndex === 0) {
          game.currentPlayerIndex = game.players.length - 1; // De zojuist toegevoegde speler
      }

      socket.join(gameId);
      console.log(`${playerName} (${socket.id}) joined game ${gameId}`);
      io.to(gameId).emit('gameUpdate', game);
    } else {
      socket.emit('gameNotFound');
    }
  });

  socket.on('reconnectGame', ({ gameId, playerName }) => {
    const game = games[gameId];
    if (game) {
        const player = game.players.find(p => p.name === playerName);
        if (player) {
            player.id = socket.id;
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
      
      // Start de beurt bij de eerste rader (index 1), indien aanwezig.
      // Anders blijft de creator (index 0) de 'actieve' speler.
      if (game.players.length > 1) {
          game.currentPlayerIndex = 1;
      }
      
      console.log(`Word set for game ${gameId}. Turn starts with player ${game.players[game.currentPlayerIndex].name}`);
      io.to(gameId).emit('gameUpdate', game);
    }
  });

  socket.on('makeGuess', ({ gameId, letter }) => {
    const game = games[gameId];
    if (!game || game.isGameOver) return;

    const player = game.players[game.currentPlayerIndex];
    if (player.id !== socket.id) {
        return; // Niet de beurt van deze speler
    }

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
    } else if (hasLost) {
      game.isGameOver = true;
      game.isWinner = false;
    } else {
      advanceTurn(game);
    }

    io.to(gameId).emit('gameUpdate', game);
  });

  socket.on('leaveGame', ({ gameId, playerName }) => {
    const game = games[gameId];
    if (!game) return;

    const playerIndex = game.players.findIndex(p => p.name === playerName);
    if (playerIndex === -1) return;

    const isLeavingPlayerActive = playerIndex === game.currentPlayerIndex;

    game.players.splice(playerIndex, 1);
    console.log(`Player ${playerName} manually left game ${gameId}`);

    if (game.players.length === 0) {
        delete games[gameId];
        console.log(`Game ${gameId} deleted.`);
        return;
    }

    if (isLeavingPlayerActive) {
        // De actieve speler verlaat het spel, geef de beurt door
        game.currentPlayerIndex = playerIndex % game.players.length;
        if (game.currentPlayerIndex === 0) { // Sla creator over
            game.currentPlayerIndex = 1 % game.players.length;
        }
        if(game.players.length < 2) game.currentPlayerIndex = 0;
    } else if (playerIndex < game.currentPlayerIndex) {
        game.currentPlayerIndex--;
    }

    io.to(gameId).emit('gameUpdate', game);
  });


  socket.on('disconnect', () => {
    console.log('user disconnected:', socket.id);
    for (const gameId in games) {
      const game = games[gameId];
      const player = game.players.find(p => p.id === socket.id);
      if (player) {
        console.log(`Player ${player.name} disconnected from game ${gameId}`);
        player.disconnected = true;
        // Als de speler die disconnected aan de beurt was, geef de beurt door
        if (game.players[game.currentPlayerIndex].id === socket.id) {
            advanceTurn(game);
            io.to(gameId).emit('gameUpdate', game);
        }
      }
    }
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'client', 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});