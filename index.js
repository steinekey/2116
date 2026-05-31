const CATEGORY_COUNT = 46;
const CATEGORY_SIZE = CATEGORY_COUNT;
const NUM_WORDS_VISIBLE = 3;

let categories;
let wordToCategory;
let board;
let score = 0;
let mistakes = 0;
let secondsElapsed = 0;

async function loadCategories() {
    // read categories from categories.json
    // capitalize and strip whitespace from each word
    const response = await fetch('categories.json');
    const data = await response.json();
    data.categories.map(category => {
        category.words = category.words.map(word => word.trim().toUpperCase());
    });

    return data.categories;
}

function buildUI() {
    const table = document.querySelector("#categories-table");
    table.innerHTML = "";

    board.forEach(row => {
        if (row.length === 0) return;

        const tr = document.createElement("tr");

        row.forEach(cellWords => {
            if (cellWords == null) return;

            const td = document.createElement("td");
            const button = buildButton(cellWords);

            td.appendChild(button);
            tr.appendChild(td);
        });

        table.appendChild(tr);
    });
}

function validate(categories) {
    // Validate the categories data
    // Check for duplicates, missing fields, etc.
    const wordSet = new Set();
    for (const category of categories) {
        for (const word of category.words) {
            if (wordSet.has(word)) {
                console.warn(`Duplicate word found: ${word}`);
            } else {
                wordSet.add(word);
            }
        }
        if (category.words.length !== CATEGORY_SIZE) {
            console.warn(`Category "${category.name}" has ${category.words.length} words, expected ${CATEGORY_SIZE}`);
        }
    }
    if (categories.length !== CATEGORY_COUNT) {
        console.warn(`Expected ${CATEGORY_COUNT} categories, found ${categories.length}`);
    }
}

function buildButton(words) {
    const button = document.createElement("button");
    updateButton(button, words);
    return button;
}

function updateButton(button, words) {
    // if they have all 46 words, show the category name and make it the colour
    if (words.length === CATEGORY_SIZE) {
        const categoryName = wordToCategory[words[0]];
        button.textContent = categoryName;
        button.style.backgroundColor = categories.find(category => category.name === categoryName).difficulty;
        button.classList.add("combined");
        button.title = words.join(", ");
        return;
    }

    const visibleWords = words.slice(0, NUM_WORDS_VISIBLE).join(", ");
    const extraCount = words.length >= NUM_WORDS_VISIBLE
        ? `, ... <span class="word-count">[${words.length}]</span>`
        : "";

    button.innerHTML = visibleWords + extraCount;
    button.classList.toggle("combined", words.length > 1);

    // on hover show the full list of words in a tooltip
    button.title = words.join(", ");
}

function handleCorrectMatch(firstButton, secondButton) {
    const firstCell = firstButton.closest("td");
    const secondCell = secondButton.closest("td");

    const firstRow = firstCell.closest("tr");
    const secondRow = secondCell.closest("tr");

    const firstRowIndex = firstRow.rowIndex;
    const firstCellIndex = firstCell.cellIndex;

    const secondRowIndex = secondRow.rowIndex;
    const secondCellIndex = secondCell.cellIndex;

    const firstWords = board[firstRowIndex][firstCellIndex];
    const secondWords = board[secondRowIndex][secondCellIndex];

    const combinedWords = [...secondWords, ...firstWords];

    // Case 1: both buttons are in the same row
    if (firstRowIndex === secondRowIndex) {
        board[secondRowIndex][secondCellIndex] = combinedWords;
        board[firstRowIndex].splice(firstCellIndex, 1);

        updateButton(secondButton, combinedWords);
        secondButton.classList.remove("selected");
        firstCell.remove();
    }

    // Case 2: buttons are in different rows
    else {
        board[secondRowIndex][secondCellIndex] = combinedWords;
        board[firstRowIndex].splice(firstCellIndex, 1);

        updateButton(secondButton, combinedWords);
        secondButton.classList.remove("selected");

        if (board[firstRowIndex].length === 0) {
            board.splice(firstRowIndex, 1);
            firstRow.remove();
        } else {
            firstCell.remove();
        }
    }

    score++;
    updateScore();
}

function handleIncorrectMatch(firstButton, secondButton) {
    // if the match is incorrect, we can just unselect the buttons and increment the mistakes counter
    firstButton.classList.remove('selected');
    secondButton.classList.remove('selected');
    mistakes++;
    updateMistakes();
}

function getButtonWords(button) {
    const cell = button.closest("td");
    const row = cell.closest("tr");
    console.log("cell index:", cell.cellIndex, "row index:", row.rowIndex);
    console.log("board value:", board[row.rowIndex][cell.cellIndex]);

    return board[row.rowIndex][cell.cellIndex];
}

function onButtonClick(button) {
    button.classList.toggle('selected');
    // check if two buttons are selected, if not do nothing
    const selectedButtons = document.querySelectorAll('#categories-table button.selected');
    if (selectedButtons.length < 2) {
        return;
    }

    // find the other selected button that is not the one that was just clicked
    const otherButton = selectedButtons[0] === button ? selectedButtons[1] : selectedButtons[0];
    // grab the first word in each of the buttons
    // they should all be in the same category, so we can just check the first word 
    // in each button against the word-to-category mapping
    const word1 = getButtonWords(otherButton)[0];
    const word2 = getButtonWords(button)[0];
    if (wordToCategory[word1] === wordToCategory[word2]) {
        handleCorrectMatch(otherButton, button);
    } else {
        alert(`Incorrect match! "${word1}" is in "${wordToCategory[word1]}" and "${word2}" is in "${wordToCategory[word2]}"`);
        handleIncorrectMatch(otherButton, button);
    }
    saveGameState();
}

function addEventListeners() {
    // Add event listeners to the buttons
    document.querySelectorAll('#categories-table button').forEach(button => {
        button.addEventListener('click', () => onButtonClick(button));
    });
}


 /**
 * Randomize array element order in-place.
 * Using Durstenfeld shuffle algorithm.
 */
function shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

function updateTimer() {
    secondsElapsed++;
    const timerElement = document.querySelector('#timer');
    // format the time as MM:SS when < 1 hour, and HH:MM:SS when >= 1 hour
    if (secondsElapsed < 3600) {
        const minutes = Math.floor(secondsElapsed / 60);
        const seconds = secondsElapsed % 60;
        timerElement.textContent = `Time: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
        const hours = Math.floor(secondsElapsed / 3600);
        const minutes = Math.floor((secondsElapsed % 3600) / 60);
        const seconds = secondsElapsed % 60;
        timerElement.textContent = `Time: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
}

async function initializeGameState() {
    categories = await loadCategories();    
    validate(categories);
    wordToCategory = {};
    categories.forEach(category => {
        category.words.forEach(word => {
            wordToCategory[word] = category.name;
        });
    });
    // need to shuffle the words and output them in a random order
    const words = Object.keys(wordToCategory);
    shuffleArray(words);
    // split board into arrays of length 46 to represent the rows of the table
    board = [...words.map(word => [word])];
    board = board.reduce((rows, word, index) => {
        if (index % CATEGORY_SIZE === 0) {
            rows.push([word]);
        } else {
            rows[rows.length - 1].push(word);
        }
        return rows;
    } , []);
}

function saveGameState() {
    const gameState = {
        categories,
        wordToCategory,
        score,
        mistakes,
        board,
        secondsElapsed
    };
    localStorage.setItem('connectionsGameState', JSON.stringify(gameState));
    console.log(board);
}

function updateScore() {
    document.querySelector('#score').textContent = `Score: ${score}`;
}

function updateMistakes() {
    document.querySelector('#mistakes').textContent = `Mistakes: ${mistakes}`;
}

function updateScoreAndMistakes() {
    updateScore();
    updateMistakes();
}

async function init() {
    // check local storage for saved game state
    const savedGameState = localStorage.getItem('connectionsGameState');
    if (savedGameState) {
        const gameState = JSON.parse(savedGameState);
        categories = gameState.categories;
        wordToCategory = gameState.wordToCategory;
        score = gameState.score;
        mistakes = gameState.mistakes;
        board = gameState.board;
        secondsElapsed = gameState.secondsElapsed;
        updateScoreAndMistakes();
    } else {
        await initializeGameState();
    }

    buildUI();
    addEventListeners();
    setInterval(() => {
        // update the timer every second
        updateTimer();
    }, 1000); 

    // save score, mistakes, and current board state to local storage every 5 seconds
    setInterval(() => {
        saveGameState();
    }, 5000);   

    saveGameState();
}


init();