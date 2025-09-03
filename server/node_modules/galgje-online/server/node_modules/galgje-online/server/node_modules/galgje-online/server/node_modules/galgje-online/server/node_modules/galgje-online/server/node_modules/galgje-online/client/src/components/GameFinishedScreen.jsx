import React from 'react';

const GameFinishedScreen = ({ gameState, resetGame }) => {
  // Sorteer spelers op score
  const sortedPlayers = [...gameState.players].sort((a, b) => b.score - a.score);

  return (
    <div className="popup-overlay">
      <div className="popup-content">
        <h2>Spel voorbij!</h2>
        <h3>Eindscores:</h3>
        <ol>
          {sortedPlayers.map(player => (
            <li key={player.id}>
              {player.name}: {player.score} punt(en)
            </li>
          ))}
        </ol>
        <button onClick={resetGame}>Nieuw Spel</button>
      </div>
    </div>
  );
};

export default GameFinishedScreen;
