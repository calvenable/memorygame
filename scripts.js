// TODO: Add a 'hard mode' with 5 colours
// TODO: Add an info modal to the start page
// TODO: Make header fixed so visible when scrolled

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
      if (this._halt) {
        super.dequeue();
        return false;
      }
    if (this._pendingPromise) return false;
    let item = super.dequeue();
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
    this._halt = true;
    while (this._items.length) {
        this.dequeue();
    }
    this._halt = false;
  }
}

const colours = ['red', 'green', 'yellow', 'blue'];
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
let infoDialog;
let showInfoDialog;
let infoDialogBtnDisplayStyle;

let demoCursor = true;

const sleep = ms => new Promise(res => setTimeout(res, ms));

function getElements() {
    // onLoad, fetch elements that we will want to modify
    statusLabel = document.getElementById('status');
    scoreCounter = document.getElementById('score');
    highscoreCounter = document.getElementById('highscore');
    highscoreCounter.innerHTML = getHighscoreDisplayText(localStorage.getItem(highscoreLocalStorageName) || 0);

    infoDialog = document.getElementById('infoDialog');
    showInfoDialog = document.getElementById("showInfoDialog");
    showInfoDialog.addEventListener('click', _ => {showTheModal()});
    document.getElementById("hideInfoDialog").addEventListener('click', _ => {infoDialog.close()});
    infoDialogBtnDisplayStyle = showInfoDialog.style.display;

    document.addEventListener('keydown', (evt) => {handleKeyPress(evt)});
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
    demoCursor = true;

    showInfoDialog.style.display = "none";
    infoDialog.close();

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
    for (let i = 0; i < sequenceLength; i++) {
        setColour(currentSequence[i]);
        await sleep(sleepLength);
        clearColour(currentSequence[i]);
        if (i < sequenceLength - 1) {
            await sleep(sleepLength);
        }
    }
    statusLabel.innerHTML = randomRepeatMessage();
    acceptingInput = true;

    if (sequenceLength == 1) {
        createDemoCursor(currentSequence[0]);
    }
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
    hideDemoCursor();

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
        
        showInfoDialog.style.display = infoDialogBtnDisplayStyle;
    }
}

function getScoreDisplayText(score) {
    // Get appropriate text to be displayed in the 'score' HTML element
    return "Score: " + score;
}

function getHighscoreDisplayText(highscore, isNew = false) {
    // Get appropriate text to be displayed in the 'highscore' HTML element
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

async function createDemoCursor(colour) {
    // Create a mouse cursor that demonstrates the user clicking on the given shape
    let targetDiv = document.getElementById(colour + "Btn");
    let cursorElement = document.createElement("img");
    cursorElement.draggable = false;
    cursorElement.classList.add("unselectable");
    cursorElement.classList.add("cursor");
    cursorElement.classList.add("hidden");
    cursorElement.src = "src/cursor.png";
    targetDiv.appendChild(cursorElement);

    await sleep(800);
    if (demoCursor) cursorElement.classList.remove("hidden");

    await sleep(800);
    cursorElement.classList.add("clicking");
    await sleep(500);
    cursorElement.classList.remove("clicking");

    await sleep(1000);
    cursorElement.classList.add("hidden");
    await sleep(500);
    targetDiv.removeChild(cursorElement);
}

async function hideDemoCursor() {
    demoCursor = false;
    let cursorMaybe = document.getElementsByClassName("cursor")[0];
    if (cursorMaybe) {
        cursorMaybe.classList.add("hidden");
    }
}

function handleKeyPress(evt) {
    switch (evt.key) {
        case "1":
        case "2":
        case "3":
        case "4":
            buttonPressed(colours[evt.key - 1]);
            break;
        case "Enter":
            start();
    }
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

const funFacts = [
    "The coloured shapes are inspired by the infamous dancing shapes from the children's TV show 'Mr Maker'",
    "You can play with the shapes when you're not in the middle of a game!",
    "If you get a score of 50, a purple elephant might appear!",
    "The shapes are called Tobee (red), Obee (green), Jobee (yellow), and Gertrude (blue).",
    "Some people call this game Simon!"
];

function showTheModal() {
    document.getElementById("funFact").innerHTML = "<strong>Fun fact:</strong> " + pickRandomFromArray(funFacts);
    infoDialog.showModal();
}

function pickRandomFromArray(arr) {
    // Returns a random item from the given array
    return arr[Math.floor(Math.random() * arr.length)];
}