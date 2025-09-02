import React from 'react';

const WordSetterScreen = ({ gameState, gameId, wordToSet, setWordToSet, setWord }) => {
  return (
    <div className="word-setter-screen">
        <h2>Spel Aangemaakt!</h2>
        <p>{gameId ? `Deel deze code: ${gameId}` : 'Code wordt geladen...'}</p>
        <input 
            type="text" 
            placeholder="Voer het woord in"
            value={wordToSet}
            onChange={(e) => setWordToSet(e.target.value)}
        />
        {/* De knop is uitgeschakeld als er geen woord is ingevoerd */}
        <button onClick={setWord} disabled={!wordToSet.trim()}>Zet Woord</button>
    </div>
  );
};

export default WordSetterScreen;
