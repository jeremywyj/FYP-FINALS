import random
import pickle
import numpy as np
import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__, static_folder='public')
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)

ROWS = 6
COLUMNS = 6
Q_TABLE_FILE = 'c4_q_table.pkl'
REWARD_LOG_FILE = 'c4_reward_log.pkl'

# Epsilon-greedy parameters
epsilon = 0.9  # Initial epsilon value for exploration
epsilon_decay_rate = 0.997  # Decay rate for epsilon
alpha = 0.5    # Learning rate
gamma = 0.9    # Discount factor

# Initialize Q-table and reward log
if os.path.exists(Q_TABLE_FILE):
    with open(Q_TABLE_FILE, 'rb') as f:
        q_table = pickle.load(f)
else:
    q_table = {}

if os.path.exists(REWARD_LOG_FILE):
    with open(REWARD_LOG_FILE, 'rb') as f:
        reward_log = pickle.load(f)
else:
    reward_log = []

game_number = len(reward_log)  # Track the number of games

def get_state_key(board):
    """
    Convert the board state to a string key for the Q-table.
    """
    return str(board)

def initialize_q_values_for_state(state_key):
    """
    Initialize Q-values for a new state if not already in the Q-table.
    """
    if state_key not in q_table:
        q_table[state_key] = [0] * COLUMNS  # Initialize Q-values for all columns to 0

def get_best_move(board, available_actions):
    """
    Get the best move based on the Q-table with exploration-exploitation strategy.
    """
    state_key = get_state_key(board)

    initialize_q_values_for_state(state_key)  # Ensure Q-values for this state are initialized

    # Exploration: Choose a random move with probability epsilon
    if random.uniform(0, 1) < epsilon:
        print("Exploration: Choosing random move")
        return random.choice(available_actions)

    # Exploitation: Choose the best move based on Q-values
    q_values = q_table[state_key]
    print(f"Q-values for state {state_key}: {q_values}")

    # Choose the best move from valid ones
    best_move = max(available_actions, key=lambda col: q_values[col])
    print(f"Exploitation: Best move selected: {best_move}")
    return best_move

def update_q_table(state_key, action, reward, next_state_key, alpha, gamma):
    """
    Update the Q-table using the Q-learning formula.
    """
    initialize_q_values_for_state(state_key)
    initialize_q_values_for_state(next_state_key)

    old_value = q_table[state_key][action]
    future_optimal_value = max(q_table[next_state_key])
    new_value = old_value + alpha * (reward + gamma * future_optimal_value - old_value)
    q_table[state_key][action] = new_value

    print(f"Updated Q-table for state {state_key}, action {action}: {q_table[state_key][action]}")

@app.route('/')
def index():
    return send_from_directory('public', 'index.html')

@app.route('/ai-move', methods=['POST'])
def ai_move():
    global epsilon  # Declare epsilon as global to modify it
    global game_number  # Track game number
    data = request.get_json()
    board = data.get('board')
    player = data.get('player')

    print(f"Received board:\n{board}\nPlayer: {player}")  # Debugging line

    available_actions = [col for col in range(COLUMNS) if is_valid_move(board, col)]

    # AI chooses a move
    move = get_best_move(board, available_actions)

    if move is None:
        move = find_random_move(board)

    print("AI Move:", move)  # Debugging line

    # Apply move and get reward
    next_board, reward, done = apply_move(board, move, player, len(available_actions))
    next_state_key = get_state_key(next_board)

    if move is not None:
        # Update Q-table
        update_q_table(get_state_key(board), move, reward, next_state_key, alpha, gamma)

        # Determine if the game is won or lost
        win_loss_status = "Win" if reward == 1 else "Loss" if reward == -1 else "Ongoing"

        # Log the reward along with game number and win/loss status
        reward_log.append((game_number, reward, win_loss_status))
        print(f"Game {game_number}, Reward: {reward}, Status: {win_loss_status}")

        # Save the Q-table and reward log
        with open(Q_TABLE_FILE, 'wb') as f:
            pickle.dump(q_table, f)
        with open(REWARD_LOG_FILE, 'wb') as f:
            pickle.dump(reward_log, f)

    # Update epsilon with decay
    epsilon = max(0.1, epsilon * epsilon_decay_rate)
    print(f"Updated epsilon: {epsilon}")

    # Increment game number
    game_number += 1

    return jsonify({
        'row': get_next_open_row(board, move),
        'col': move
    })

def apply_move(board, col, player, move_count):
    """
    Apply the move to the board and return the next state, reward, and whether the game is done.
    """
    next_board = [r[:] for r in board]  # Copy the board
    row = get_next_open_row(next_board, col)
    next_board[row][col] = player

    reward = 0
    done = False

    if check_win(next_board, player):
        reward = 1  # Reward for winning
        done = True
    elif check_win(next_board, get_opponent(player)):
        reward = -1  # Penalty for letting the opponent win
        done = True
    else:
        # Check if the opponent has a winning move, reward for blocking it
        for opponent_col in range(COLUMNS):
            if is_valid_move(next_board, opponent_col):
                temp_board = [r[:] for r in next_board]
                temp_row = get_next_open_row(temp_board, opponent_col)
                temp_board[temp_row][opponent_col] = get_opponent(player)
                if check_win(temp_board, get_opponent(player)):
                    reward += 0.5  # Reward for blocking opponent's win
                    break

        # Check if the AI sets up a winning move for the next turn
        if check_win(next_board, player):
            reward += 0.5  # Reward for setting up a winning move

    return next_board, reward, done

def get_opponent(player):
    """Returns the opponent's player number."""
    return 1 if player == 2 else 2

def find_random_move(board):
    valid_moves = [col for col in range(COLUMNS) if is_valid_move(board, col)]
    if valid_moves:
        return random.choice(valid_moves)
    return None

def is_valid_move(board, col):
    return board[0][col] is None

def get_next_open_row(board, col):
    for row in range(ROWS-1, -1, -1):
        if board[row][col] is None:
            return row
    return None

def check_win(board, player):
    # Horizontal, vertical, and diagonal checks for win conditions
    for row in range(ROWS):
        for col in range(COLUMNS-3):
            if all(board[row][col+i] == player for i in range(4)):
                return True

    for col in range(COLUMNS):
        for row in range(ROWS-3):
            if all(board[row+i][col] == player for i in range(4)):
                return True

    for row in range(ROWS-3):
        for col in range(COLUMNS-3):
            if all(board[row+i][col+i] == player for i in range(4)):
                return True

    for row in range(3, ROWS):
        for col in range(COLUMNS-3):
            if all(board[row-i][col+i] == player for i in range(4)):
                return True

    return False

if __name__ == '__main__':
    app.run(port=4001, debug=True)
