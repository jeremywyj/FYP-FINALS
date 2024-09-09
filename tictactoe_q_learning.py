from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import numpy as np
import random
import os

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# File paths
Q_TABLE_FILE = 'ttt_q_table.pkl'
REWARD_LOG_FILE = 'ttt_reward_log.pkl'

# Load or initialize the Q-table
if os.path.exists(Q_TABLE_FILE):
    with open(Q_TABLE_FILE, 'rb') as f:
        q_table = pickle.load(f)
else:
    q_table = {}

# Initialize or load the reward log
if os.path.exists(REWARD_LOG_FILE):
    with open(REWARD_LOG_FILE, 'rb') as f:
        reward_log = pickle.load(f)
else:
    reward_log = []

def get_best_move(board, epsilon=0.2):
    """
    Get the best move based on the Q-table with some exploration.
    epsilon: Probability of making a random move (exploration).
    """
    state = tuple(0 if cell is None else 1 if cell == 'X' else 2 for cell in board)
    
    # Exploration: Random move
    if random.uniform(0, 1) < epsilon or state not in q_table:
        return make_random_move(board)
    
    # Exploitation: Best move based on Q-values
    q_values = q_table[state]
    return int(np.argmax(q_values)) if len(q_values) > 0 else make_random_move(board)

def make_random_move(board):
    """
    Make a random move from the available moves.
    """
    available_moves = get_available_moves(board)
    if available_moves:
        return random.choice(available_moves)
    return None

@app.route('/get_move', methods=['POST'])
def get_move():
    """
    Endpoint to get the AI's move using Q-learning.
    """
    data = request.get_json()
    board = data['board']
    player = data['player']

    # Get the AI move using Q-learning
    move = get_best_move(board)
    if move is None:
        # If no valid move found by Q-learning, make a random move
        move = make_random_move(board)
    
    # Update state and calculate reward
    next_state = tuple(0 if cell is None else 1 if cell == 'X' else 2 for cell in board)
    reward = 0
    
    if move is not None:
        next_board = board[:]
        next_board[move] = player
        if check_win(next_board, player):
            reward = 1  # Reward for winning
        elif None not in next_board:
            reward = 0.5  # Reward for drawing
        else:
            reward = -0.1  # Slight penalty for each move to encourage quick wins

        # Update Q-table
        update_q_table(q_table, tuple(0 if cell is None else 1 if cell == 'X' else 2 for cell in board), move, reward, next_state, alpha=0.1, gamma=0.9)
        
        # Log the reward
        reward_log.append(reward)
        print(f"Reward for this move: {reward}")

        # Save the Q-table and reward log
        with open(Q_TABLE_FILE, 'wb') as f:
            pickle.dump(q_table, f)
        with open(REWARD_LOG_FILE, 'wb') as f:
            pickle.dump(reward_log, f)
    else:
        # If no move is determined, default to an invalid move
        move = -1
        print("AI could not determine a valid move.")

    return jsonify({'move': int(move)})

def get_available_moves(board):
    """
    Get a list of available moves (empty spots on the board).
    """
    return [i for i, cell in enumerate(board) if cell is None]

def check_win(board, player):
    """
    Check if the given player has won the game.
    """
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

def update_q_table(q_table, state, action, reward, next_state, alpha, gamma):
    """
    Update the Q-table using the Q-learning formula.
    alpha: Learning rate (how much we update the Q-value).
    gamma: Discount factor (importance of future rewards).
    """
    if state not in q_table:
        q_table[state] = [0]*9  # Initialize state with 0 values if not in Q-table
    
    old_value = q_table[state][action]
    future_optimal_value = max(q_table.get(next_state, [0]*9))
    new_value = old_value + alpha * (reward + gamma * future_optimal_value - old_value)
    q_table[state][action] = new_value

if __name__ == '__main__':
    app.run(port=5001, debug=True)
