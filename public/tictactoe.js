let board = Array(9).fill(null); // Represents the board state
let currentPlayer = 'X'; // Start with Player X
let playerXType = 'me'; // Default to human
let playerOType = 'me'; // Default to human
let playerXScore = 0; // Score for Player X
let playerOScore = 0; // Score for Player O
let drawCounter = 0; // Draw counter
let autoClickEnabled = false; // Flag for auto-click
let autoClickInterval = null; // Interval for auto-click

// Initialize game
function startGame() {
    board = Array(9).fill(null);
    currentPlayer = 'X';
    document.getElementById('game-screen').style.display = 'block';
    document.getElementById('start-screen').style.display = 'none';
    updatePlayerTypes();
    updateDisplay();
}

// Update player types
function updatePlayerTypes() {
    playerXType = document.querySelector('input[name="playerX"]:checked').value;
    playerOType = document.querySelector('input[name="playerO"]:checked').value;
}

// Update game board display
function updateDisplay() {
    const cells = document.querySelectorAll('#game-board .cell');
    cells.forEach((cell, index) => {
        cell.textContent = board[index] ? board[index] : '';
        cell.style.pointerEvents = board[index] || isGameOver() ? 'none' : 'auto'; // Disable click on filled cells or game over
    });

    document.getElementById('currentPlayer').textContent = `Player ${currentPlayer}`;
    document.getElementById('playerXScore').textContent = `Score: ${playerXScore}`;
    document.getElementById('playerOScore').textContent = `Score: ${playerOScore}`;
    document.getElementById('drawCounter').textContent = `Draws: ${drawCounter}`;
    
    // Update message and AI button visibility
    if (currentPlayer === 'X' && playerXType === 'me' || currentPlayer === 'O' && playerOType === 'me') {
        document.getElementById('message').textContent = 'Your move!';
        document.getElementById('aiMoveButton').style.display = 'none';
        document.getElementById('aiMoveButtonQ').style.display = 'none';
    } else if (currentPlayer === 'X' && playerXType === 'rule-based' || currentPlayer === 'O' && playerOType === 'rule-based') {
        document.getElementById('message').textContent = 'Rule-Based AI\'s turn';
        document.getElementById('aiMoveButton').style.display = 'block';
        document.getElementById('aiMoveButtonQ').style.display = 'none';
    } else if (currentPlayer === 'X' && playerXType === 'q-learning' || currentPlayer === 'O' && playerOType === 'q-learning') {
        document.getElementById('message').textContent = 'Q-Learning AI\'s turn';
        document.getElementById('aiMoveButton').style.display = 'none';
        document.getElementById('aiMoveButtonQ').style.display = 'block';
    }
}

// Handle cell click
function handleClick(index) {
    if (!board[index] && !isGameOver() && (currentPlayer === 'X' && playerXType === 'me' || currentPlayer === 'O' && playerOType === 'me')) {
        board[index] = currentPlayer;
        if (checkWin()) {
            updateScore(currentPlayer);
            updateDisplay();
        } else if (board.every(cell => cell)) {
            drawCounter++;
            resetBoard(); // Clear the board after a draw
            updateDisplay();
        } else {
            currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
            updateDisplay();
            // Remove AI move trigger here
        }
    }
}


// Check for a win condition
function checkWin() {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
        [0, 4, 8], [2, 4, 6] // Diagonals
    ];
    return winPatterns.some(pattern => 
        pattern.every(index => board[index] === currentPlayer)
    );
}

// Check if the game is over
function isGameOver() {
    return checkWin() || board.every(cell => cell);
}

// Make AI move
function makeAIMove(aiType) {
    console.log("AI Move Button Clicked");
    console.log("AI Type:", aiType);

    let port;
    if (aiType === 'rule-based') {
        port = 5000;
    } else if (aiType === 'q-learning') {
        port = 5001;
    } else {
        console.error('Unknown AI type:', aiType);
        return;
    }

    const url = `http://localhost:${port}/get_move`;

    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ board: board, player: currentPlayer, aiMode: aiType })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        console.log(`Server Response from Port ${port}:`, data);
        const move = data.move;
        if (move !== undefined && !board[move] && !isGameOver()) {
            board[move] = currentPlayer;
            if (checkWin()) {
                updateScore(currentPlayer);
            } else if (board.every(cell => cell)) {
                drawCounter++;
                resetBoard(); // Clear the board after a draw
            } else {
                currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
            }
            updateDisplay();
        }
    })
    .catch(error => console.error('Error:', error));
}

// Update score
function updateScore(winner) {
    if (winner === 'X') {
        playerXScore++;
    } else if (winner === 'O') {
        playerOScore++;
    }
    resetBoard(); // Clear the board after updating score
}

// Reset the board
function resetBoard() {
    board = Array(9).fill(null);
    currentPlayer = 'X'; // Reset current player to X
}

// Reset game
function resetGame() {
    startGame();
}

// Set player types
document.getElementById('playerXMe').addEventListener('change', () => playerXType = 'me');
document.getElementById('playerXRuleBased').addEventListener('change', () => playerXType = 'rule-based');
document.getElementById('playerXQLearning').addEventListener('change', () => playerXType = 'q-learning');
document.getElementById('playerOMe').addEventListener('change', () => playerOType = 'me');
document.getElementById('playerORuleBased').addEventListener('change', () => playerOType = 'rule-based');
document.getElementById('playerOQLearning').addEventListener('change', () => playerOType = 'q-learning');

// Add event listeners to cells
document.querySelectorAll('#game-board .cell').forEach((cell, index) => {
    cell.addEventListener('click', () => handleClick(index));
});

// Auto-click functionality
function startAutoClick() {
    const aiType = currentPlayer === 'X' ? playerXType : playerOType;
    if (autoClickEnabled) {
        setTimeout(() => {
            makeAIMove(aiType);
            autoClickInterval = setTimeout(startAutoClick, 50); // Auto-click every 5 seconds
        }, 50); // Initial delay of 5 seconds
    }
}

function stopAutoClick() {
    if (autoClickInterval) {
        clearTimeout(autoClickInterval);
        autoClickInterval = null;
    }
}

// Event listener for auto-click checkbox
document.getElementById('autoClickCheckbox').addEventListener('change', (event) => {
    autoClickEnabled = event.target.checked;
    if (autoClickEnabled) {
        startAutoClick();
    } else {
        stopAutoClick();
    }
});

// Check localStorage for dark mode preference
document.addEventListener("DOMContentLoaded", function() {
    if (localStorage.getItem('darkMode') === 'enabled') {
        document.body.classList.add('dark-mode');
        document.getElementById('mode-toggle').textContent = 'Switch to Light Mode';
    }
});

// Add event listener for the dark mode toggle button
document.getElementById('mode-toggle').addEventListener('click', function() {
    document.body.classList.toggle('dark-mode');
    if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('darkMode', 'enabled');
        this.textContent = 'Switch to Light Mode';
    } else {
        localStorage.setItem('darkMode', 'disabled');
        this.textContent = 'Switch to Dark Mode';
    }
});
