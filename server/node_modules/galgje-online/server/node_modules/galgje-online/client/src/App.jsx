import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';

const socket = io();

function App() {
  const [gameState, setGameState] = useState(null);
  const [gameId, setGameId] = useState('');
  const [wordToSet, setWordToSet] = useState('');
  const [isCreator, setIsCreator] = useState(false);

  useEffect(() => {
    socket.on('gameUpdate', (newGameState) => {
      setGameState(newGameState);
    });

    socket.on('gameCreated', (newGameId) => {
        setGameId(newGameId);
        setGameState({ message: `Spel aangemaakt! Deel deze code: ${newGameId}` });
    });

    socket.on('gameNotFound', () => {
        alert('Spel niet gevonden!');
    });

    socket.on('wordIsSet', () => {
        setIsCreator(false); // Now this player is a guesser
    });

    return () => {
      socket.off('gameUpdate');
      socket.off('gameCreated');
      socket.off('gameNotFound');
      socket.off('wordIsSet');
    };
  }, []);

  const createGame = () => {
    socket.emit('createGame');
    setIsCreator(true);
  };

  const joinGame = () => {
    if (gameId) {
      socket.emit('joinGame', gameId);
    }
  };

  const setWord = () => {
      if (wordToSet) {
          socket.emit('setWord', { gameId, word: wordToSet });
          setWordToSet('');
      }
  };

  const makeGuess = (letter) => {
    socket.emit('makeGuess', { gameId, letter });
  };

  const renderContent = () => {
    if (!gameState) {
      return (
        <div>
          <button onClick={createGame}>Nieuw Spel</button>
          <hr />
          <input 
            type="text" 
            placeholder="Voer spelcode in" 
            value={gameId}
            onChange={(e) => setGameId(e.target.value)}
          />
          <button onClick={joinGame}>Deelnemen</button>
        </div>
      );
    }

    if (isCreator && !gameState.word) {
        return (
            <div>
                <h2>{gameState.message}</h2>
                <input 
                    type="text" 
                    placeholder="Voer het woord in" 
                    value={wordToSet}
                    onChange={(e) => setWordToSet(e.target.value)}
                />
                <button onClick={setWord}>Zet Woord</button>
            </div>
        )
    }

    return (
      <div className="game-container">
        <h1>Galgje</h1>
        <HangmanDrawing incorrectGuesses={gameState.incorrectGuesses.length} />
        <p className="word-display">{gameState.word}</p>
        <p>Foute gokken: {gameState.incorrectGuesses.join(', ')}</p>
        <Keyboard onGuess={makeGuess} guessedLetters={gameState.correctGuesses.concat(gameState.incorrectGuesses)} />
        {gameState.isGameOver && (
            <h2>{gameState.isWinner ? 'Gewonnen!' : `Verloren! Het woord was: ${gameState.secretWord}`}</h2>
        )}
      </div>
    );
  };

  return <div className="App">{renderContent()}</div>;
}

// --- Componenten ---

const HangmanDrawing = ({ incorrectGuesses }) => {
    const stages = [
    `
      +---+
      |   |
          |
          |
          |
          |
    =========`,
    `
      +---+
      |   |
      O   |
          |
          |
          |
    =========`,
    `
      +---+
      |   |
      O   |
      |   |
          |
          |
    =========`,
    `
      +---+
      |   |
      O   |
     /|   |
          |
          |
    =========`,
    `
      +---+
      |   |
      O   |
     /|\  |
          |
          |
    =========`,
    `
      +---+
      |   |
      O   |
     /|\  |
     /    |
          |
    =========`,
    `
      +---+
      |   |
      O   |
     /|\  |
     / \  |
          |
    =========`
    ];

    return <div className="hangman-drawing">{stages[incorrectGuesses]}</div>
}

const Keyboard = ({ onGuess, guessedLetters }) => {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');

    return (
        <div className="keyboard">
            {alphabet.map(letter => (
                <button 
                    key={letter} 
                    onClick={() => onGuess(letter)}
                    disabled={guessedLetters.includes(letter)}
                >
                    {letter}
                </button>
            ))}
        </div>
    )
}

export default App;