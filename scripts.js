// TODO: Animations for other button
// TODO: Add variety in filler text messages
// TODO: Add clicks to a process queue to avoid rate limiting
// TODO: Add key bindings so 1234 can be used instead of clicking
// TODO: Allow playing with the characters when a game is not in progress

const colours = ['red', 'yellow', 'green', 'blue'];
let startingColours = [...colours]; // Shallow copy
const flashColours = {
    'red': '#ff4c4c',
    'green': '#21eb21',
    'yellow': '#dbdf1a',
    'blue': '#14bcff'
}
const defaultColour = '#ffffff';
const highscoreLocalStorageName = "hs";

let currentSequence = [];
let inputSequence = [];

let score = 0;
let acceptingInput = false;

let statusLabel;
let scoreCounter;
let highscoreCounter;

const sleep = ms => new Promise(res => setTimeout(res, ms))

function getElements() {
    // onLoad, fetch elements that we will want to modify
    statusLabel = document.getElementById('status');
    scoreCounter = document.getElementById('score');
    highscoreCounter = document.getElementById('highscore');
    highscoreCounter.innerHTML = getHighscoreDisplayText(localStorage.getItem(highscoreLocalStorageName) || 0);
}

async function start() {
    // Reset variables and start a new sequence
    score = 0;
    startingColours = [...colours];
    currentSequence = [];
    inputSequence = [];
    hideStartButton();
    await showHappyFaces();
    scoreCounter.innerHTML = getScoreDisplayText(score);
    highscoreCounter.innerHTML = getHighscoreDisplayText(localStorage.getItem(highscoreLocalStorageName) || 0);

    currentSequence.push(newColour());
    statusLabel.innerHTML = 'Watch carefully...';
    await sleep(800);
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
    const sequenceLength = currentSequence.length;
    const sleepLength = getSleepLength(sequenceLength);
    for (let i = 0; i < sequenceLength; i++) {
        setColour(currentSequence[i]);
        await sleep(sleepLength);
        clearColour(currentSequence[i]);
        if (i < sequenceLength - 1) {
            await sleep(sleepLength);
        }
    }
    statusLabel.innerHTML = 'Now repeat what you saw!';
    acceptingInput = true;
}

function getSleepLength(sequenceLength) {
    // Determine how long to wait between flashing each colour in the sequence
    if (sequenceLength < 5) {
        return 600;
    }
    else if (sequenceLength < 10) {
        return 450;
    }
    else {
        return 300;
    }
}

async function buttonPressed(colour) {
    // Submit a button press and check for end of sequence / incorrect submission
    if (acceptingInput) {
        acceptingInput = false;
        setColour(colour);
        await sleep(300);
        clearColour(colour);
        inputSequence.push(colour);

        if (inputSequence[inputSequence.length - 1] == currentSequence[inputSequence.length - 1]) {
            if (inputSequence.length == currentSequence.length) {
                // Completed current sequence!
                score++;
                scoreCounter.innerHTML = getScoreDisplayText(score);
                if (score > localStorage.getItem(highscoreLocalStorageName)) {
                    localStorage.setItem(highscoreLocalStorageName, score);
                    highscoreCounter.innerHTML = getHighscoreDisplayText(score, true);
                }

                inputSequence = [];
                currentSequence.push(newColour());
                statusLabel.innerHTML = "That's right!";
                await sleep(1000);
                statusLabel.innerHTML = 'Watch carefully...';
                await sleep(600);
                displaySequence();
            }
            else {
                acceptingInput = true;
            }
        } else {
            // Mistake! End the game.
            statusLabel.innerHTML = "<em>Oh no! That wasn't right!</em>";
            await hideHappyFaces();
            gameEnd = false;
            await sleep(1000);
            showStartButton();
        }
    }

}

function getScoreDisplayText(score) {
    return "Score: " + score;
}

function getHighscoreDisplayText(highscore, isNew = false) {
    if (isNew) {
        return "Highscore: <strong>" + highscore + "</strong>"
    }
    else {
        return "Highscore: " + highscore;
    }
}

function setColour(colour) {
    applyButtonColour(colour);
}

function clearColour(colour) {
    applyButtonColour(colour, clear=true);
}

function applyButtonColour(colour, clear = false) {
    // Set a button's background colour to its flashing or default state
    let button = document.getElementById(colour + 'Btn');
    button.style.backgroundColor = clear ? defaultColour : flashColours[colour];
    if (clear) {
        button.classList.remove("selected");
    }
    else {
        button.classList.add("selected");
    }
}


function hideStartButton() {
    // Hide the start button while the game is in progress
    let startButton = document.getElementById('startBtn');
    startButton.style.visibility = 'hidden';
}

function showStartButton() {
    // Show the start button at the end of the game
    let startButton = document.getElementById('startBtn');
    startButton.style.visibility = 'visible';
    startButton.innerHTML = 'Start New Game';
}

async function showHappyFaces() {
    await setFaces(true);
}

async function hideHappyFaces() {
    await setFaces(false);
}

async function setFaces(toHappy) {
    let happyFaces = document.getElementsByClassName("happy");
    let sadFaces = document.getElementsByClassName("sad");

    for (let i=0; i<happyFaces.length; i++) {
        happyFaces[i].hidden = !toHappy;
        sadFaces[i].hidden = toHappy;
        await sleep(100);
    }
}