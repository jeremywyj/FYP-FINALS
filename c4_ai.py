from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import random

app = Flask(__name__, static_folder='public')

# Allow CORS for all domains and routes
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

ROWS = 6
COLUMNS = 6

@app.route('/')
def index():
    return send_from_directory('public', 'index.html')

@app.route('/ai-move', methods=['POST'])
def ai_move():
    data = request.get_json()
    board = data.get('board')
    player = data.get('player')

    print("Received Data:", data)  # Debugging line

    ai_move = determine_ai_move(board, player)

    print("AI Move:", ai_move)  # Debugging line

    return jsonify({
        'row': ai_move[0],
        'col': ai_move[1]
    })

def determine_ai_move(board, player):
    # Try to find a winning or blocking move
    ai_move = find_best_move(board, player)
    print("Determined Move:", ai_move)  # Debugging line
    return ai_move if ai_move else find_random_move(board)

def find_best_move(board, player):
    opponent = 'O' if player == 'X' else 'X'

    # First, check for a winning move for the AI
    for col in range(COLUMNS):
        if is_valid_move(board, col):
            row = get_next_open_row(board, col)
            temp_board = [r[:] for r in board]
            temp_board[row][col] = player
            if check_win(temp_board, player):
                print(f"AI winning move found at: ({row}, {col})")  # Debugging line
                return (row, col)

    # Next, check if the opponent has a winning move and block it
    for col in range(COLUMNS):
        if is_valid_move(board, col):
            row = get_next_open_row(board, col)
            temp_board = [r[:] for r in board]
            temp_board[row][col] = opponent
            if check_win(temp_board, opponent):
                print(f"Blocking move found at: ({row}, {col})")  # Debugging line
                return (row, col)

    # If no winning/blocking move, choose a random move
    return find_random_move(board)



def find_random_move(board):
    valid_moves = [col for col in range(COLUMNS) if is_valid_move(board, col)]
    print("Valid Moves:", valid_moves)  # Debugging line
    if valid_moves:
        col = random.choice(valid_moves)
        return (get_next_open_row(board, col), col)
    return (None, None)

def is_valid_move(board, col):
    valid = board[0][col] is None
    print(f"Column {col} valid: {valid}")  # Debugging line
    return valid

def get_next_open_row(board, col):
    for row in range(ROWS-1, -1, -1):
        if board[row][col] is None:
            return row
    return None

def check_win(board, player):
    # Check horizontal, vertical, and diagonal win conditions
    for row in range(ROWS):
        for col in range(COLUMNS-3):
            if all(board[row][col+i] == player for i in range(4)):
                print(f"Horizontal win for {player} at row {row} starting from column {col}")  # Debugging line
                return True

    for col in range(COLUMNS):
        for row in range(ROWS-3):
            if all(board[row+i][col] == player for i in range(4)):
                print(f"Vertical win for {player} at column {col} starting from row {row}")  # Debugging line
                return True

    for row in range(ROWS-3):
        for col in range(COLUMNS-3):
            if all(board[row+i][col+i] == player for i in range(4)):
                print(f"Diagonal win for {player} at ({row}, {col}) down-right")  # Debugging line
                return True

    for row in range(3, ROWS):
        for col in range(COLUMNS-3):
            if all(board[row-i][col+i] == player for i in range(4)):
                print(f"Diagonal win for {player} at ({row}, {col}) up-right")  # Debugging line
                return True

    return False



if __name__ == '__main__':
    app.run(port=4000, debug=True)
