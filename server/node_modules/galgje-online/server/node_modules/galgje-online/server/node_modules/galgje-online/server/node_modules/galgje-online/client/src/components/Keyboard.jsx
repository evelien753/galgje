import React from 'react';

const Keyboard = ({ onGuess, guessedLetters, isDisabled }) => {
    const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');

    return (
        <div className="keyboard">
            {alphabet.map(letter => (
                <button 
                    key={letter} 
                    onClick={() => onGuess(letter)}
                    disabled={isDisabled || guessedLetters.includes(letter)}
                >
                    {letter}
                </button>
            ))}
        </div>
    )
}

export default Keyboard;
