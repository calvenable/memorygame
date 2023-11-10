//TODO: Correct endgame clearing of sequence so it doesn't run on after death
//   To replicate, enter correct sequence but double-click last button
//TODO: Make sequence display speed up as score increases
//TODO: Add key bindings so 1234 can be used instead of clicking

const colours = ['red', 'yellow', 'green', 'blue'];
let startingColours = [...colours]; // Shallow copy
const flashColours = {
    'red': 'red',
    'green': 'green',
    'yellow': 'gold',
    'blue': 'blue'
}
const defaultColour = 'whitesmoke';

let currentSequence = [];
let inputSequence = [];

let score = 0;
let highscore = 0;
let acceptingInput = false;

let statusLabel;
let scoreCounter;
let highscoreCounter;

function getElements() {
    statusLabel = document.getElementById('status');
    scoreCounter = document.getElementById('score');
    highscoreCounter = document.getElementById('highscore');
}

function start() {
    // Reset variables and start a new sequence
    score = 0;
    startingColours = [...colours];
    currentSequence = [];
    inputSequence = [];
    hideStartButton();
    scoreCounter.innerHTML = score;
    highscoreCounter.innerHTML = highscore;

    currentSequence.push(newColour());
    statusLabel.innerHTML = 'Watch carefully...';
    displaySequence();
}

function newColour() {
    // Return a random colour to add to the sequence
    // If in the first four moves, take a colour from startingColours instead
    if (score < 4) {
        let newColour = startingColours[Math.floor(Math.random() * startingColours.length)];
        let index = startingColours.indexOf(newColour);
        if (index > -1) {
            startingColours.splice(index, 1);
        }
        return newColour;
    }
    return colours[Math.floor(Math.random() * colours.length)];
}

async function displaySequence() {
    // Flash each colour in the current sequence
    for (let i = 0; i < currentSequence.length; i++) {
        setColour(currentSequence[i]);
        await sleep(700);
        clearColour(currentSequence[i]);
        await sleep(700);
    }
    statusLabel.innerHTML = 'Now repeat what you saw!';
    acceptingInput = true;
}

async function buttonPressed(colour) {
    // Submit a button press and check for end of sequence / incorrect submission
    if (acceptingInput) {
        setColour(colour);
        await sleep(700);
        clearColour(colour);
        inputSequence.push(colour);

        if (inputSequence[inputSequence.length - 1] == currentSequence[inputSequence.length - 1]) {
            if (inputSequence.length == currentSequence.length) {
                // Completed current sequence!
                score++;
                scoreCounter.innerHTML = score;
                if (score > highscore) {
                    highscore = score;
                    highscoreCounter.innerHTML = '<strong>' + highscore + '</strong>';
                }

                inputSequence = [];
                currentSequence.push(newColour());
                statusLabel.innerHTML = 'That\'s right!';
                acceptingInput = false;
                await sleep(1000);
                statusLabel.innerHTML = 'Watch carefully...';
                await sleep(600);
                displaySequence();
            }
        } else {
            // Mistake! End the game.
            statusLabel.innerHTML = '<em>Oh no! That wasn\'t right!</em>';
            gameEnd = false;
            acceptingInput = false;
            await sleep(1000);
            showStartButton();
        }
    }

}

function setColour(colour) {
    // Set a button's background colour to its flashing state
    let button = document.getElementById(colour + 'Btn');
    button.style.backgroundColor = flashColours[colour];
}

function clearColour(colour) {
    // Set a button's background colour back to its default
    let button = document.getElementById(colour + 'Btn');
    button.style.backgroundColor = defaultColour;
}


function hideStartButton() {
    // Hide the start button while the game is in progress
    let stBtn = document.getElementById('startBtn');
    stBtn.style.visibility = 'hidden';
}

function showStartButton() {
    // Show the start button at the end of the game
    let stBtn = document.getElementById('startBtn');
    stBtn.style.visibility = 'visible';
    stBtn.innerHTML = 'Start New Game';
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
