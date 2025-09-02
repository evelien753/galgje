import React from 'react';

const GameOverPopup = ({ gameState, isCreator, resetGame }) => {
  const { isWinner, secretWord } = gameState;

  let message = '';
  if (isWinner) {
    // De rader(s) hebben het woord geraden
    message = isCreator ? 'Verloren! De raders hebben gewonnen!' : 'Gewonnen!';
  } else {
    // Het woord werd niet geraden (galgje compleet)
    message = isCreator ? 'Gewonnen! De raders hebben het woord niet geraden.' : `Verloren! Het woord was: ${secretWord}`;
  }

  return (
    <div className="popup-overlay">
      <div className="popup-content">
        <h2>{message}</h2>
        <button onClick={resetGame}>Terug naar start</button>
      </div>
    </div>
  );
};

export default GameOverPopup;
