import React from 'react';
import HangmanDrawing from './HangmanDrawing';
import Keyboard from './Keyboard';

const GameScreen = ({ gameState, gameId, makeGuess, isDisabled, amIWordSetter, amICreator, stopGame, activePlayerName, isMyTurn }) => {
  if (!gameState) return <div>Spel laden...</div>;

  const turnIndicator = () => {
      if (amIWordSetter) {
          return <p className="turn-indicator">Jij bent de woordzetter. De anderen raden.</p>;
      }
      if (isMyTurn) {
          return <p className="turn-indicator">Jij bent aan de beurt!</p>;
      } else {
          return <p className="turn-indicator">Wachten op je beurt. Aan de beurt: {activePlayerName}</p>;
      }
  }

  return (
    <div className="game-container">
      <div className="game-header">
        <h1>Galgje - Ronde {gameState.currentRound}</h1>
        {amICreator && <button onClick={stopGame} className="quit-button">Stop Spel</button>}
      </div>
      <p className="game-id-display">Spel ID: {gameId}</p>
      <p className="game-id-display">Spelers: {gameState.players.map(p => `${p.name} (${p.score})`).join(', ')}</p>
      
      {turnIndicator()}

      <HangmanDrawing incorrectGuesses={gameState.incorrectGuesses.length} />
      
      <p className="word-display">{gameState.word}</p>
      
      {amIWordSetter && gameState.secretWord && (
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
