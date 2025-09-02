import React from 'react';

const StartScreen = ({ createGame, gameId, setGameId, joinGame, playerName, setPlayerName }) => {
  return (
    <div className="start-screen">
      <h1>Galgje Spel</h1>
      <input
        type="text"
        placeholder="Voer je naam in"
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
        className="player-name-input"
      />
      <button onClick={createGame}>Nieuw Spel Starten</button>
      <div className="join-game-section">
        <input 
          type="text" 
          placeholder="Voer spelcode in" 
          value={gameId}
          onChange={(e) => setGameId(e.target.value)}
        />
        <button onClick={joinGame}>Deelnemen aan Spel</button>
      </div>
    </div>
  );
};

export default StartScreen;
