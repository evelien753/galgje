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

function advanceTurn(game) {
    if (game.players.length < 2) return; // Kan de beurt niet doorgeven

    let nextIndex = game.currentPlayerIndex;
    do {
        nextIndex = (nextIndex + 1) % game.players.length;
    } while (nextIndex === game.wordSetterIndex); // Sla altijd de woordzetter over

    game.currentPlayerIndex = nextIndex;
    console.log(`[Game ${game.id}] Advanced turn to player ${game.players[game.currentPlayerIndex].name}`);
}



io.on('connection', (socket) => {
  console.log('a user connected:', socket.id);

  socket.on('createGame', (playerName) => {
    const gameId = Math.random().toString(36).substring(2, 7);
    games[gameId] = {
      id: gameId,
      creator: socket.id, // De oorspronkelijke maker, voor het geval dat nodig is
      players: [{ id: socket.id, name: playerName, score: 0 }], // Score bijhouden
      secretWord: null,
      word: '',
      correctGuesses: [],
      incorrectGuesses: [],
      isRoundOver: false,
      roundWinner: null, // 'setter' or 'guesser'
      roundMessage: '', // bv. "Woord geraden!" of "Helaas, te veel foute gokken."
      currentPlayerIndex: 0, // De index van de speler die aan de beurt is om te raden
      wordSetterIndex: 0, // De index van de speler die het woord zet
      currentRound: 1,
      isGameFinished: false, // Wordt true als alle rondes gespeeld zijn
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
        player = { id: socket.id, name: playerName, score: 0 };
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
    // Controleer of de zender de huidige woordzetter is
    if (game && game.players[game.wordSetterIndex].id === socket.id) {
      game.secretWord = word.toLowerCase();
      game.word = createWordDisplay(game.secretWord, game.correctGuesses);
      
      // Bepaal wie de eerste rader is. Sla de woordzetter over.
      game.currentPlayerIndex = (game.wordSetterIndex + 1) % game.players.length;
      
      console.log(`Word set for game ${gameId}. Turn starts with player ${game.players[game.currentPlayerIndex].name}`);
      io.to(gameId).emit('gameUpdate', game);
    }
  });

  socket.on('makeGuess', ({ gameId, letter }) => {
    const game = games[gameId];
    if (!game || game.isRoundOver) return;

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
      game.isRoundOver = true;
      game.roundWinner = 'guesser';
      game.roundMessage = `Goed gedaan! jullie bebben het woord geraden.`;
      game.players[game.currentPlayerIndex].score++; // Geef de rader een punt
    } else if (hasLost) {
      game.isRoundOver = true;
      game.roundWinner = 'setter';
      game.roundMessage = `Helaas, het woord was '${game.secretWord}'.`;
      game.players[game.wordSetterIndex].score++; // Geef de woordzetter een punt
    } else {
      advanceTurn(game);
    }

    io.to(gameId).emit('gameUpdate', game);
  });

  socket.on('startNextRound', ({ gameId }) => {
    const game = games[gameId];
    if (!game || !game.isRoundOver) return;

    // Reset ronde-state
    game.isRoundOver = false;
    game.secretWord = null;
    game.word = '';
    game.correctGuesses = [];
    game.incorrectGuesses = [];
    game.roundWinner = null;
    game.roundMessage = '';

    // Roteer de woordzetter
    game.wordSetterIndex = (game.wordSetterIndex + 1) % game.players.length;
    game.currentRound++;

    // Bepaal de volgende rader, sla de nieuwe woordzetter over
    game.currentPlayerIndex = (game.wordSetterIndex + 1) % game.players.length;

    io.to(gameId).emit('gameUpdate', game);
  });

  socket.on('stopGame', ({ gameId }) => {
    const game = games[gameId];
    // Alleen de creator kan het spel stoppen
    if (!game || game.creator !== socket.id) return;

    game.isGameFinished = true;
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

    socket.to(gameId).emit('gameUpdate', game);
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