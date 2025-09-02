import React from 'react';
import HangmanDrawing from './HangmanDrawing';
import Keyboard from './Keyboard';

const GameScreen = ({ gameState, isCreator, gameId, makeGuess, resetGame }) => {
  if (!gameState) return <div>Spel laden...</div>;

  return (
    <div className="game-container">
      <div className="game-header">
        <h1>Galgje</h1>
        <button onClick={resetGame} className="quit-button">Terug naar Start</button>
      </div>
      <p className="game-id-display">Spel ID: {gameId}</p>
      
      <HangmanDrawing incorrectGuesses={gameState.incorrectGuesses.length} />
      
      <p className="word-display">{gameState.word}</p>
      
      {/* Toon het geheime woord alleen aan de maker van het spel */}
      {isCreator && gameState.secretWord && (
          <p className="secret-word-display">Geheim woord: {gameState.secretWord}</p>
      )}
      
      <p>Foute gokken: {gameState.incorrectGuesses.join(', ')}</p>
      
      {/* Toon de lijst met spelers */}
      {gameState.players && gameState.players.length > 0 && (
        <p>Spelers: {gameState.players.map(p => p.name).join(', ')}</p>
      )}

      <Keyboard 
        onGuess={makeGuess} 
        guessedLetters={[...gameState.correctGuesses, ...gameState.incorrectGuesses]}
        isDisabled={isCreator}
      />
    </div>
  );
};

export default GameScreen;