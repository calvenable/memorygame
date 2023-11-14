// TODO: Add clicks to a process queue to avoid rate limiting
// TODO: Add key bindings so 1234 can be used instead of clicking
// TODO: Add mouse click pointer image to first shape

class Queue {
    constructor() { this._items = []; }
    enqueue(item) { this._items.push(item); }
    dequeue()     { return this._items.shift(); }
    get size()    { return this._items.length; }
  }

class AutoQueue extends Queue {
  constructor() {
    super();
    this._pendingPromise = false;
    this._halt = false;
  }

  enqueue(action) {
    return new Promise((resolve, reject) => {
      super.enqueue({ action, resolve, reject });
      this.dequeue();
    });
  }

  async dequeue() {
    if (this._pendingPromise) return false;
    let item = super.dequeue();
    if (this._halt) return false;
    if (!item) return false;

    try {
      this._pendingPromise = true;
      let payload = await item.action(this);
      this._pendingPromise = false;
      item.resolve(payload);
    } catch (e) {
      this._pendingPromise = false;
      item.reject(e);
    } finally {
      this.dequeue();
    }
    return true;
  }

  halt() {
    this._halt = true;
  }
  reset() {
    while (this._items.length) {
        this._pendingPromise = false;
        this.dequeue();
    }
    this._halt = false;
  }
}

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
let inputQueue = new AutoQueue();

let score = 0;
let gameInProgress = false;
let acceptingInput = false;

let statusLabel;
let scoreCounter;
let highscoreCounter;

const sleep = ms => new Promise(res => setTimeout(res, ms));

function getElements() {
    // onLoad, fetch elements that we will want to modify
    statusLabel = document.getElementById('status');
    scoreCounter = document.getElementById('score');
    highscoreCounter = document.getElementById('highscore');
    highscoreCounter.innerHTML = getHighscoreDisplayText(localStorage.getItem(highscoreLocalStorageName) || 0);
}

async function start() {
    // Reset variables and start a new sequence
    if (gameInProgress) {
        return;
    }
    gameInProgress = true;

    score = 0;
    startingColours = [...colours];
    currentSequence = [];
    inputSequence = [];
    inputQueue.reset();

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
    if (score < colours.length) {
        let newColour = pickRandomFromArray(startingColours);
        let index = startingColours.indexOf(newColour);
        if (index > -1) {
            startingColours.splice(index, 1);
        }
        return newColour;
    }
    return pickRandomFromArray(colours);
}

async function displaySequence() {
    // Flash each colour in the current sequence
    const sequenceLength = currentSequence.length;
    const sleepLength = getSleepLength(sequenceLength);
    await t(sequenceLength, sleepLength);
    statusLabel.innerHTML = randomRepeatMessage();
    acceptingInput = true;
}

async function t(sqLen, spLen) {
    for (let i = 0; i < sqLen; i++) {
        setColour(currentSequence[i]);
        await sleep(spLen);
        clearColour(currentSequence[i]);
        if (i < sqLen - 1) {
            await sleep(spLen);
        }
    }
    return;
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
    // Submit a button press
    if (acceptingInput) {
        inputQueue.enqueue(async _ => {await processInput(colour)});
    }
    else if (!gameInProgress) {
        showHappyFace(colour);
        setColour(colour);
        await sleep(300);
        clearColour(colour);
    }
}

async function processInput(colour) {
    // show button press and check for end of sequence / incorrect submission
    setColour(colour);
    await sleep(300);
    clearColour(colour);
    await sleep(50);
    inputSequence.push(colour);

    if (inputSequence[inputSequence.length - 1] == currentSequence[inputSequence.length - 1]) {
        if (inputSequence.length == currentSequence.length) {
            // Completed current sequence!
            acceptingInput = false;
            score++;
            scoreCounter.innerHTML = getScoreDisplayText(score);
            if (score > localStorage.getItem(highscoreLocalStorageName)) {
                localStorage.setItem(highscoreLocalStorageName, score);
                highscoreCounter.innerHTML = getHighscoreDisplayText(score, true);
            }

            inputSequence = [];
            inputQueue.reset();
            currentSequence.push(newColour());
            statusLabel.innerHTML = randomSuccessMessage();
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
        acceptingInput = false;
        inputQueue.halt();
        statusLabel.innerHTML = "<em>" + randomFailMessage() + "</em>";
        await hideHappyFaces();
        await sleep(1000);
        showStartButton();
        gameInProgress = false;
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
    startButton.classList.add('fadeout');
}

function showStartButton() {
    // Show the start button at the end of the game
    let startButton = document.getElementById('startBtn');
    startButton.classList.remove('fadeout');
    startButton.innerHTML = 'Play again';
}

async function showHappyFaces() {
    await setFaces(true);
}

async function hideHappyFaces() {
    await setFaces(false);
}

async function setFaces(toHappy) {
    // Set the face that is showing on each shape to the value of the boolean argument
    // true=happy faces, false=sad faces
    let happyFaces = document.getElementsByClassName("happy");
    let sadFaces = document.getElementsByClassName("sad");

    for (let i=0; i<happyFaces.length; i++) {
        happyFaces[i].hidden = !toHappy;
        sadFaces[i].hidden = toHappy;
        // await sleep(100);
    }
}

function showHappyFace(colour) {
    // Given a colour, set the face on that colour's shape to happy
    let buttonDiv = document.getElementById(colour + "Btn");
    buttonDiv.getElementsByClassName('happy')[0].hidden = false;
    buttonDiv.getElementsByClassName('sad')[0].hidden = true;
}

const failMessages = [
    "Oh no! That wasn't right!",
    "Oops! That wasn't right!",
    "Oh no! You made a mistake!",
    "Oops! That was the wrong colour!"
];

function randomFailMessage() {
    return pickRandomFromArray(failMessages);
}

const successMessages = [
    "That's right!",
    "Nice memory!",
    "You got it!",
    "All right!",
    "Great work!"
];

function randomSuccessMessage() {
    return pickRandomFromArray(successMessages);
}

const repeatMessages = [
    "Now repeat what you saw!",
    "Can you repeat the sequence?"
];

function randomRepeatMessage() {
    return pickRandomFromArray(repeatMessages);
}

function pickRandomFromArray(arr) {
    // Returns a random item from the given array
    return arr[Math.floor(Math.random() * arr.length)];
}