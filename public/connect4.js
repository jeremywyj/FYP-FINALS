let board = Array(6).fill(null).map(() => Array(6).fill(null)); // Represents the board state
let currentPlayer = 'Red'; // Start with Player Red
let playerRedType = 'me'; // Default to human
let playerYellowType = 'me'; // Default to human
let playerRedScore = 0; // Score for Player Red
let playerYellowScore = 0; // Score for Player Yellow
let drawCounter = 0; // Draw counter
let autoClickEnabled = false; // Flag for auto-click
let autoClickInterval = null; // Interval for auto-click

// Initialize game
function startGame() {
    board = Array(6).fill(null).map(() => Array(6).fill(null));
    currentPlayer = 'Red';
    document.getElementById('game-screen').style.display = 'block';
    document.getElementById('start-screen').style.display = 'none';
    updatePlayerTypes();
    updateDisplay();
    generateBoard();
}

// Generate the 6x6 board
function generateBoard() {
    const gameBoard = document.getElementById('game-board');
    gameBoard.innerHTML = ''; // Clear existing cells
    for (let j = 0; j < 6; j++) {
        const column = document.createElement('div');
        column.classList.add('column');
        for (let i = 0; i < 6; i++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.row = i;
            cell.dataset.col = j;
            cell.id = `cell-${i}-${j}`; // Set the unique ID
            cell.addEventListener('click', () => handleClick(i, j));
            column.appendChild(cell);
        }
        gameBoard.appendChild(column);
    }
}


// Update player types
function updatePlayerTypes() {
    playerRedType = document.querySelector('input[name="playerRed"]:checked').value;
    playerYellowType = document.querySelector('input[name="playerYellow"]:checked').value;
}

// Update game board display
function updateDisplay() {
    const cells = document.querySelectorAll('#game-board .cell');
    cells.forEach(cell => {
        const row = cell.dataset.row;
        const col = cell.dataset.col;
        const color = board[row][col];
        cell.style.backgroundColor = color ? color : 'white';
        // Disable click on filled cells or game over or AI's turn
        cell.style.pointerEvents = color || isGameOver() || (currentPlayer !== 'Red' && playerRedType !== 'me' && currentPlayer === 'Red') || (currentPlayer !== 'Yellow' && playerYellowType !== 'me' && currentPlayer === 'Yellow') ? 'none' : 'auto';
    });

    document.getElementById('currentPlayer').textContent = `Player ${currentPlayer}`;
    document.getElementById('playerRedScore').textContent = `Score: ${playerRedScore}`;
    document.getElementById('playerYellowScore').textContent = `Score: ${playerYellowScore}`;
    document.getElementById('drawCounter').textContent = `Draws: ${drawCounter}`;

    // Update message and AI button visibility
    if (currentPlayer === 'Red' && playerRedType === 'me' || currentPlayer === 'Yellow' && playerYellowType === 'me') {
        document.getElementById('message').textContent = 'Your move!';
        document.getElementById('aiMoveButton').style.display = 'none';
        document.getElementById('aiMoveButtonQ').style.display = 'none';
    } else if (currentPlayer === 'Red' && playerRedType === 'rule-based' || currentPlayer === 'Yellow' && playerYellowType === 'rule-based') {
        document.getElementById('message').textContent = 'Rule-Based AI\'s turn';
        document.getElementById('aiMoveButton').style.display = 'block';
        document.getElementById('aiMoveButtonQ').style.display = 'none';
    } else if (currentPlayer === 'Red' && playerRedType === 'q-learning' || currentPlayer === 'Yellow' && playerYellowType === 'q-learning') {
        document.getElementById('message').textContent = 'Q-Learning AI\'s turn';
        document.getElementById('aiMoveButton').style.display = 'none';
        document.getElementById('aiMoveButtonQ').style.display = 'block';
    }
}


// Handle player moves
function handleClick(row, col) {
    if (currentPlayer === 'Red' && playerRedType !== 'me' || currentPlayer === 'Yellow' && playerYellowType !== 'me') {
        // Ignore clicks when it's an AI's turn
        return;
    }

    if (!board[row][col] && !isGameOver()) {
        // Drop the piece in the lowest available row of the selected column
        for (let i = 5; i >= 0; i--) {
            if (!board[i][col]) {
                board[i][col] = currentPlayer;
                console.log(`Placed ${currentPlayer} piece in Row ${i}, Col ${col}`);
                break;
            }
        }

        if (checkWin()) {
            updateScore(currentPlayer);
            updateDisplay();
            setTimeout(() => {
                resetBoard(); // Clear the board after a win
                updateDisplay();
            }, 1000); // Optional delay to show the winning move
        } else if (board.flat().every(cell => cell)) {
            drawCounter++;
            resetBoard(); // Clear the board after a draw
            updateDisplay();
        } else {
            currentPlayer = currentPlayer === 'Red' ? 'Yellow' : 'Red';
            updateDisplay();
            // Handle AI moves if needed
        }
    }
}

function makeAIMove(aiType) {
    console.log("AI Move Button Clicked");
    console.log("AI Type:", aiType);

    let port;
    if (aiType === 'rule-based') {
        port = 4000;  // Rule-based AI Flask port
    } else if (aiType === 'q-learning') {
        port = 4001;  // Q-learning AI Flask port
    }

    fetch(`http://localhost:${port}/ai-move`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            board: board,
            player: currentPlayer
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log("Received AI move data:", data); // Debug log
        const { row, col } = data;

        if (row !== undefined && col !== undefined) {
            board[row][col] = currentPlayer; // Update board state
            updateBoard(row, col, currentPlayer); // Update UI

            if (checkWin()) {
                updateScore(currentPlayer); // Update score
                setTimeout(() => {
                    resetBoard(); // Clear board after a win
                    updateDisplay();
                }, 1000);
            } else if (board.flat().every(cell => cell)) {
                drawCounter++;
                resetBoard(); // Clear board after a draw
                updateDisplay();
            } else {
                currentPlayer = currentPlayer === 'Red' ? 'Yellow' : 'Red'; // Switch player
                updateDisplay();
            }
        } else {
            console.error('Invalid move data received');
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}



function updateBoard(row, col, player) {
    const cell = document.querySelector(`.cell[data-row="${row}"][data-col="${col}"]`);
    if (cell) {
        cell.style.backgroundColor = player === 'Red' ? 'red' : 'yellow'; // Use colors consistent with your game
    } else {
        console.error(`Cell not found: Row ${row}, Col ${col}`);
    }
}


// Check for a win condition
function checkWin() {
    const directions = [
        { x: 1, y: 0 }, // Horizontal
        { x: 0, y: 1 }, // Vertical
        { x: 1, y: 1 }, // Diagonal \
        { x: 1, y: -1 } // Diagonal /
    ];

    function isWin(row, col) {
        const color = board[row][col];
        for (const { x, y } of directions) {
            let count = 1;
            // Check in positive direction
            for (let i = 1; i < 4; i++) {
                const r = row + i * x;
                const c = col + i * y;
                if (r < 0 || r >= 6 || c < 0 || c >= 6 || board[r][c] !== color) break;
                count++;
            }
            // Check in negative direction
            for (let i = 1; i < 4; i++) {
                const r = row - i * x;
                const c = col - i * y;
                if (r < 0 || r >= 6 || c < 0 || c >= 6 || board[r][c] !== color) break;
                count++;
            }
            if (count >= 4) return true;
        }
        return false;
    }

    for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 6; col++) {
            if (board[row][col] && isWin(row, col)) return true;
        }
    }

    return false;
}


// Check if the game is over
function isGameOver() {
    return checkWin() || board.flat().every(cell => cell);
}

// Update scores
function updateScore(winner) {
    if (winner === 'Red') {
        playerRedScore++;
    } else if (winner === 'Yellow') {
        playerYellowScore++;
    }
}

// Reset the board
function resetBoard() {
    board = Array(6).fill(null).map(() => Array(6).fill(null));
    currentPlayer = 'Red';
    updateDisplay();
}

// Reset the game
function resetGame() {
    resetBoard();
    drawCounter = 0;
    playerRedScore = 0;
    playerYellowScore = 0;
    updateDisplay();
}

// Auto-click feature
document.getElementById('autoClickCheckbox').addEventListener('change', (event) => {
    autoClickEnabled = event.target.checked;
    
    if (autoClickEnabled) {
        autoClickInterval = setInterval(() => {
            if (currentPlayer === 'Red' && playerRedType !== 'me') {
                makeAIMove(playerRedType);
            } else if (currentPlayer === 'Yellow' && playerYellowType !== 'me') {
                makeAIMove(playerYellowType);
            }
        }, 1500);
    } else {
        clearInterval(autoClickInterval);
    }
});




// Dark Mode Toggle
document.getElementById('mode-toggle').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    document.getElementById('mode-toggle').textContent = isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode';
});

// Initialize the game board on page load
generateBoard();


