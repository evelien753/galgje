import React from 'react';
import HangmanDrawing from './HangmanDrawing';
import Keyboard from './Keyboard';

const GameScreen = ({ gameState, isCreator, gameId, makeGuess, resetGame, isDisabled, activePlayerName }) => {
  if (!gameState) return <div>Spel laden...</div>;

  const turnIndicator = () => {
      if (isCreator) {
          return <p className="turn-indicator">Kijken naar: {activePlayerName}</p>;
      }
      if (isDisabled) {
          return <p className="turn-indicator">Wachten op je beurt. Aan de beurt: {activePlayerName}</p>;
      } else {
          return <p className="turn-indicator">Jij bent aan de beurt!</p>;
      }
  }

  return (
    <div className="game-container">
      <div className="game-header">
        <h1>Galgje</h1>
        <button onClick={resetGame} className="quit-button">Terug naar Start</button>
      </div>
      <p className="game-id-display">Spel ID: {gameId}</p>
      <p className="game-id-display">Spelers: {gameState.players.map(p => p.name).join(', ')}</p>
      
      {turnIndicator()}

      <HangmanDrawing incorrectGuesses={gameState.incorrectGuesses.length} />
      
      <p className="word-display">{gameState.word}</p>
      
      {isCreator && gameState.secretWord && (
          <p className="secret-word-display">Geheim woord: {gameState.secretWord}</p>
      )}
      
      <p>Foute gokken: {gameState.incorrectGuesses.join(', ')}</p>

      <Keyboard 
        onGuess={makeGuess} 
        guessedLetters={[...gameState.correctGuesses, ...gameState.incorrectGuesses]}
        isDisabled={isDisabled}
      />
    </div>
  );
};

export default GameScreen;
