import React from 'react';

const RoundOverPopup = ({ gameState, startNextRound, isCreator }) => {
  const { roundMessage } = gameState;

  return (
    <div className="popup-overlay">
      <div className="popup-content">
        <h2>Ronde voorbij!</h2>
        <p>{roundMessage}</p>
        {/* Toon de knop alleen aan de creator om te voorkomen dat iedereen klikt */}
        {isCreator && <button onClick={startNextRound}>Volgende Ronde</button>}
        {!isCreator && <p>Wacht tot de spelleider de volgende ronde start...</p>}
      </div>
    </div>
  );
};

export default RoundOverPopup;