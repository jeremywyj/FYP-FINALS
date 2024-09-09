from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__, static_folder='public')
CORS(app)  # Enable CORS for all routes

@app.route('/')
def index():
    return send_from_directory('public', 'index.html')

@app.route('/get_move', methods=['POST'])
def get_move():
    data = request.get_json()
    board = data['board']
    player = data['player']
    ai_mode = data.get('aiMode', 'rule-based')
    
    # Calculate the best move based on the AI mode
    if ai_mode == 'rule-based':
        move = find_best_move(board, player)
    else:
        move = find_random_move(board)
    
    return jsonify({'move': move})

def find_best_move(board, player):
    opponent = 'O' if player == 'X' else 'X'
    
    # Check for winning moves for the current player
    for move in get_available_moves(board):
        new_board = board[:]
        new_board[move] = player
        if check_win(new_board, player):
            return move
    
    # Block opponent's winning moves
    for move in get_available_moves(board):
        new_board = board[:]
        new_board[move] = opponent
        if check_win(new_board, opponent):
            return move
    
    # If no winning/blocking move, choose a random move
    available_moves = get_available_moves(board)
    return available_moves[0] if available_moves else None

def find_random_move(board):
    available_moves = get_available_moves(board)
    return available_moves[0] if available_moves else None

def get_available_moves(board):
    return [i for i, cell in enumerate(board) if cell is None]

def check_win(board, player):
    win_patterns = [
        [0, 1, 2],
        [3, 4, 5],
        [6, 7, 8],
        [0, 3, 6],
        [1, 4, 7],
        [2, 5, 8],
        [0, 4, 8],
        [2, 4, 6]
    ]
    
    return any(all(board[i] == player for i in pattern) for pattern in win_patterns)

if __name__ == '__main__':
    app.run(port=5000, debug=True)

