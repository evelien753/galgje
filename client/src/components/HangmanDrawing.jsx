import React from 'react';

const GallowsBase = () => <img src="/assets/wood_base.svg" alt="Gallows Base" className="gallows-base" />;
const GallowsUpright = () => <img src="/assets/wood_vertical.svg" alt="Gallows Upright" className="gallows-upright" />;
const GallowsTop = () => <img src="/assets/wood_horizontal.svg" alt="Gallows Top" className="gallows-top" />;
const GallowsRope = () => <div className="gallows-rope"></div>;

const Head = () => <div className="hangman-part head"></div>;
const Body = () => <div className="hangman-part body"></div>;
const LeftArm = () => <div className="hangman-part left-arm"></div>;
const RightArm = () => <div className="hangman-part right-arm"></div>;
const LeftLeg = () => <div className="hangman-part left-leg"></div>;
const RightLeg = () => <div className="hangman-part right-leg"></div>;

const ALL_PARTS = [
    GallowsBase,
    GallowsUpright,
    GallowsTop,
    GallowsRope,
    Head,
    Body,
    LeftArm,
    RightArm,
    LeftLeg,
    RightLeg,
];

const HangmanDrawing = ({ incorrectGuesses }) => {
    return (
        <div className="hangman-drawing-container">
            {ALL_PARTS.slice(0, incorrectGuesses).map((Part, index) => <Part key={index} />)}
        </div>
    );
}

export default HangmanDrawing;
