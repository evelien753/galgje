import React, { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import './App.css';

// Importeer de componenten
import StartScreen from './components/StartScreen';
import WordSetterScreen from './components/WordSetterScreen';
import GameScreen from './components/GameScreen';
import GameOverPopup from './components/GameOverPopup';

const socket = io('http://localhost:3001');

// Helper om state uit sessionStorage te halen
const getInitialState = (key, defaultValue) => {
  const storedValue = sessionStorage.getItem(key);
  return storedValue ? JSON.parse(storedValue) : defaultValue;
};

function App() {
  const [gameState, setGameState] = useState(null);
  const [gameId, setGameId] = useState(() => getInitialState('gameId', ''));
  const [wordToSet, setWordToSet] = useState('');
  const [playerName, setPlayerName] = useState(() => getInitialState('playerName', ''));
  const [socketId, setSocketId] = useState(null);
  const [screen, setScreen] = useState(() => getInitialState('screen', 'start'));

  // State opslaan in sessionStorage
  useEffect(() => {
    sessionStorage.setItem('gameId', JSON.stringify(gameId));
  }, [gameId]);

  useEffect(() => {
    sessionStorage.setItem('playerName', JSON.stringify(playerName));
  }, [playerName]);

  useEffect(() => {
    // Sla niet 'loading' op, zodat we bij refresh opnieuw kunnen proberen te verbinden
    if (screen !== 'loading') {
      sessionStorage.setItem('screen', JSON.stringify(screen));
    }
  }, [screen]);

  const resetGame = useCallback(() => {
    // Maak state en sessionStorage leeg
    setGameState(null);
    setGameId('');
    setWordToSet('');
    setPlayerName('');
    setScreen('start');
    sessionStorage.removeItem('gameId');
    sessionStorage.removeItem('playerName');
    sessionStorage.removeItem('screen');
    // Optioneel: de server informeren dat de speler het spel verlaat
    if (gameId) {
        socket.emit('leaveGame', { gameId, playerName });
    }
  }, [gameId, playerName]);

  useEffect(() => {
    const handleConnect = () => {
      setSocketId(socket.id);
      // Probeer opnieuw te verbinden als we sessiegegevens hebben
      const storedGameId = getInitialState('gameId', '');
      const storedPlayerName = getInitialState('playerName', '');
      if (storedGameId && storedPlayerName) {
        setScreen('loading');
        socket.emit('reconnectGame', { gameId: storedGameId, playerName: storedPlayerName });
      }
    };

    socket.on('connect', handleConnect);

    socket.on('gameUpdate', (newGameState) => {
      setGameState(newGameState);
      const amICreator = newGameState.creator === socket.id;

      if (newGameState.isGameOver) {
        setScreen('game'); // Zorg ervoor dat het gamescherm wordt weergegeven met de popup
      } else if (!newGameState.word) {
        setScreen(amICreator ? 'wordSetter' : 'waiting');
      } else {
        setScreen('game');
      }
    });

    socket.on('gameCreated', (newGameId) => {
        setGameId(newGameId);
        setScreen('wordSetter');
    });

    socket.on('gameNotFound', () => {
        alert('Spel niet gevonden! Je wordt teruggestuurd naar het startscherm.');
        resetGame();
    });
    
    socket.on('reconnectFailed', () => {
        alert('Kon niet opnieuw verbinden met het spel. Probeer het opnieuw.');
        resetGame();
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('gameUpdate');
      socket.off('gameCreated');
      socket.off('gameNotFound');
      socket.off('reconnectFailed');
    };
  }, [resetGame]);

  const createGame = () => {
    if (!playerName) return alert('Voer een naam in.');
    socket.emit('createGame', playerName);
    setScreen('loading');
  };

  const joinGame = () => {
    if (!playerName || !gameId) return alert('Voer een naam en spelcode in.');
    socket.emit('joinGame', { gameId, playerName });
    setScreen('loading');
  };

  const setWord = () => {
    if (wordToSet && gameId) {
        socket.emit('setWord', { gameId, word: wordToSet });
        setWordToSet('');
        setScreen('loading');
    }
  };

  const makeGuess = (letter) => {
    socket.emit('makeGuess', { gameId, letter });
  };

  const renderContent = () => {
    const isCreator = gameState?.creator === socketId;
    const activePlayer = gameState?.players[gameState.currentPlayerIndex];
    const isMyTurn = activePlayer?.id === socketId;

    const keyboardDisabled = isCreator || !isMyTurn;

    if (screen === 'game' && gameState?.isGameOver) {
      return (
        <>
          <GameScreen 
            gameState={gameState} 
            isCreator={isCreator} 
            gameId={gameId} 
            makeGuess={makeGuess} 
            resetGame={resetGame} 
            isDisabled={true} // Keyboard altijd uit bij game over
            activePlayerName={activePlayer?.name}
          />
          <GameOverPopup gameState={gameState} isCreator={isCreator} resetGame={resetGame} />
        </>
      );
    }

    switch (screen) {
      case 'start':
        return <StartScreen createGame={createGame} gameId={gameId} setGameId={setGameId} joinGame={joinGame} playerName={playerName} setPlayerName={setPlayerName} />;
      case 'wordSetter':
        return <WordSetterScreen gameState={gameState} gameId={gameId} wordToSet={wordToSet} setWordToSet={setWordToSet} setWord={setWord} />;
      case 'waiting':
        return (
          <div className="waiting-screen">
            <h2>Wachten op de spelleider om een woord in te stellen...</h2>
            {gameState?.players && <p>Spelers: {gameState.players.map(p => p.name).join(', ')}</p>}
          </div>
        );
      case 'game':
        if (!gameState) return <div>Spel herstellen...</div>;
        return <GameScreen 
            gameState={gameState} 
            isCreator={isCreator} 
            gameId={gameId} 
            makeGuess={makeGuess} 
            resetGame={resetGame} 
            isDisabled={keyboardDisabled}
            activePlayerName={activePlayer?.name}
        />;
      case 'loading':
        return <div>Laden...</div>;
      default:
        return <div>Laden...</div>;
    }
  };

  return <div className="App">{renderContent()}</div>;
}

export default App;