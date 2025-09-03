import React, { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import './App.css';

// Importeer de componenten
import StartScreen from './components/StartScreen';
import WordSetterScreen from './components/WordSetterScreen';
import GameScreen from './components/GameScreen';
import RoundOverPopup from './components/RoundOverPopup';
import GameFinishedScreen from './components/GameFinishedScreen';

const socket = io('http://localhost:3001');

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

  useEffect(() => {
    sessionStorage.setItem('gameId', JSON.stringify(gameId));
  }, [gameId]);

  useEffect(() => {
    sessionStorage.setItem('playerName', JSON.stringify(playerName));
  }, [playerName]);

  const resetGame = useCallback(() => {
    if (gameId) {
        socket.emit('leaveGame', { gameId, playerName });
    }
    setGameState(null);
    setGameId('');
    setWordToSet('');
    sessionStorage.removeItem('gameId');
  }, [gameId, playerName]);

  useEffect(() => {
    const handleConnect = () => {
      setSocketId(socket.id);
      const storedGameId = getInitialState('gameId', '');
      const storedPlayerName = getInitialState('playerName', '');
      if (storedGameId && storedPlayerName) {
        socket.emit('reconnectGame', { gameId: storedGameId, playerName: storedPlayerName });
      }
    };

    const handleGameUpdate = (newGameState) => {
      if (!gameId || gameId !== newGameState.id) return;
      setGameState(newGameState);
    };

    const handleGameCreated = (newGameId) => {
        setGameId(newGameId);
    };

    const handleGameNotFound = () => {
        alert('Spel niet gevonden! Je wordt teruggestuurd naar het startscherm.');
        resetGame();
    };
    
    const handleReconnectFailed = () => {
        alert('Kon niet opnieuw verbinden met het spel. Probeer het opnieuw.');
        resetGame();
    };

    socket.on('connect', handleConnect);
    socket.on('gameUpdate', handleGameUpdate);
    socket.on('gameCreated', handleGameCreated);
    socket.on('gameNotFound', handleGameNotFound);
    socket.on('reconnectFailed', handleReconnectFailed);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('gameUpdate', handleGameUpdate);
      socket.off('gameCreated', handleGameCreated);
      socket.off('gameNotFound', handleGameNotFound);
      socket.off('reconnectFailed', handleReconnectFailed);
    };
  }, [resetGame, gameId]);

  const createGame = () => {
    if (!playerName) return alert('Voer een naam in.');
    socket.emit('createGame', playerName);
  };

  const joinGame = () => {
    if (!playerName || !gameId) return alert('Voer een naam en spelcode in.');
    socket.emit('joinGame', { gameId, playerName });
  };

  const setWord = () => {
    if (wordToSet && gameId) {
        socket.emit('setWord', { gameId, word: wordToSet });
        setWordToSet('');
    }
  };

  const makeGuess = (letter) => {
    socket.emit('makeGuess', { gameId, letter });
  };

  const startNextRound = () => {
    socket.emit('startNextRound', { gameId });
  };

  const stopGame = () => {
    socket.emit('stopGame', { gameId });
  };

  const renderContent = () => {
    if (!gameState) {
      return <StartScreen createGame={createGame} gameId={gameId} setGameId={setGameId} joinGame={joinGame} playerName={playerName} setPlayerName={setPlayerName} />;
    }

    if (gameState.isGameFinished) {
      return <GameFinishedScreen gameState={gameState} resetGame={resetGame} />;
    }

    const amIWordSetter = gameState.players[gameState.wordSetterIndex]?.id === socketId;
    const amICreator = gameState.creator === socketId;
    const activePlayer = gameState.players[gameState.currentPlayerIndex];
    const isMyTurn = activePlayer?.id === socketId;

    // Toon het spelscherm met de juiste popup als de ronde voorbij is
    if (gameState.isRoundOver) {
      return (
        <>
          <GameScreen 
            gameState={gameState} 
            gameId={gameId} 
            makeGuess={makeGuess} 
            isDisabled={true} // Keyboard altijd uit als de ronde voorbij is
            amIWordSetter={amIWordSetter}
            amICreator={amICreator}
            stopGame={stopGame}
            activePlayerName={activePlayer?.name}
            isMyTurn={isMyTurn}
          />
          <RoundOverPopup gameState={gameState} startNextRound={startNextRound} isCreator={amICreator} />
        </>
      );
    }

    // Als er nog geen woord is, toon het woordzetter- of wachtscherm
    if (!gameState.secretWord) {
      if (amIWordSetter) {
        return <WordSetterScreen gameState={gameState} gameId={gameId} wordToSet={wordToSet} setWordToSet={setWordToSet} setWord={setWord} />;
      } else {
        const wordSetterName = gameState.players[gameState.wordSetterIndex]?.name || '...';
        return (
          <div className="waiting-screen">
            <h2>Wachten tot {wordSetterName} een woord instelt...</h2>
            <p>Ronde: {gameState.currentRound}</p>
            <p>Spelers: {gameState.players.map(p => p.name).join(', ')}</p>
          </div>
        );
      }
    }

    // Toon het actieve spelscherm
    return <GameScreen 
        gameState={gameState} 
        gameId={gameId} 
        makeGuess={makeGuess} 
        isDisabled={amIWordSetter || !isMyTurn}
        amIWordSetter={amIWordSetter}
        amICreator={amICreator}
        stopGame={stopGame}
        activePlayerName={activePlayer?.name}
        isMyTurn={isMyTurn}
    />;
  };

  return <div className="App">{renderContent()}</div>;
}

export default App;
