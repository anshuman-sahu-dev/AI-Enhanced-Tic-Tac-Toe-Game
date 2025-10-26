// Game State
let gameState = {
    board: Array(9).fill(null),
    currentPlayer: 'X',
    winner: null,
    isGameOver: false,
    isDraw: false,
    gameMode: 'pvp', // 'pvp' or 'ai'
    aiDifficulty: 'medium', // 'easy', 'medium', 'hard'
    isAiTurn: false
};

// Game Statistics
let gameStats = {
    playerX: 0,
    playerO: 0,
    draws: 0
};

// Settings
let settings = {
    soundEnabled: true,
    musicEnabled: false,
    volume: 50,
    theme: 'default'
};

// Winning combinations
const WINNING_COMBINATIONS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6] // Diagonals
];

// DOM Elements
const gameBoard = document.getElementById('gameBoard');
const statusText = document.getElementById('statusText');
const gameStatus = document.getElementById('gameStatus');
const newGameBtn = document.getElementById('newGameBtn');
const resetScoreBtn = document.getElementById('resetScoreBtn');
const playerX = document.getElementById('playerX');
const playerO = document.getElementById('playerO');
const celebration = document.getElementById('celebration');
const drawMessage = document.getElementById('drawMessage');
const celebrationText = document.getElementById('celebrationText');
const settingsBtn = document.getElementById('settingsBtn');
const settingsPanel = document.getElementById('settingsPanel');
const closeSettings = document.getElementById('closeSettings');
const aiThinking = document.getElementById('aiThinking');

// Score elements
const scoreX = document.getElementById('scoreX');
const scoreO = document.getElementById('scoreO');
const scoreDraw = document.getElementById('scoreDraw');
const playerOLabel = document.getElementById('playerOLabel');
const playerOIndicator = document.getElementById('playerOIndicator');

// Settings elements
const soundToggle = document.getElementById('soundToggle');
const musicToggle = document.getElementById('musicToggle');
const volumeSlider = document.getElementById('volumeSlider');
const volumeValue = document.getElementById('volumeValue');
const backgroundMusic = document.getElementById('backgroundMusic');

// Sound Effects (using Web Audio API for better performance)
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Create sound effects using oscillators
function createBeep(frequency, duration, type = 'sine') {
    if (!settings.soundEnabled) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(settings.volume / 100 * 0.1, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
}

// Sound effects
const sounds = {
    move: () => createBeep(800, 0.1, 'square'),
    win: () => {
        createBeep(523, 0.2);
        setTimeout(() => createBeep(659, 0.2), 100);
        setTimeout(() => createBeep(784, 0.3), 200);
    },
    draw: () => createBeep(400, 0.5, 'sawtooth'),
    click: () => createBeep(1000, 0.05, 'square'),
    aiMove: () => createBeep(600, 0.15, 'triangle')
};

// AI Logic
class TicTacToeAI {
    constructor(difficulty = 'medium') {
        this.difficulty = difficulty;
    }

    getMove(board, player) {
        switch (this.difficulty) {
            case 'easy':
                return this.getRandomMove(board);
            case 'medium':
                return this.getMediumMove(board, player);
            case 'hard':
                return this.getHardMove(board, player);
            default:
                return this.getMediumMove(board, player);
        }
    }

    getRandomMove(board) {
        const availableMoves = board.map((cell, index) => cell === null ? index : null)
                                   .filter(val => val !== null);
        return availableMoves[Math.floor(Math.random() * availableMoves.length)];
    }

    getMediumMove(board, player) {
        // 70% chance to make optimal move, 30% random
        if (Math.random() < 0.7) {
            return this.getHardMove(board, player);
        }
        return this.getRandomMove(board);
    }

    getHardMove(board, player) {
        const opponent = player === 'X' ? 'O' : 'X';
        
        // Try to win
        let move = this.findWinningMove(board, player);
        if (move !== -1) return move;
        
        // Block opponent from winning
        move = this.findWinningMove(board, opponent);
        if (move !== -1) return move;
        
        // Take center if available
        if (board[4] === null) return 4;
        
        // Take corners
        const corners = [0, 2, 6, 8];
        const availableCorners = corners.filter(pos => board[pos] === null);
        if (availableCorners.length > 0) {
            return availableCorners[Math.floor(Math.random() * availableCorners.length)];
        }
        
        // Take any available move
        return this.getRandomMove(board);
    }

    findWinningMove(board, player) {
        for (let combination of WINNING_COMBINATIONS) {
            const [a, b, c] = combination;
            const line = [board[a], board[b], board[c]];
            
            if (line.filter(cell => cell === player).length === 2 && 
                line.filter(cell => cell === null).length === 1) {
                return combination[line.indexOf(null)];
            }
        }
        return -1;
    }
}

const ai = new TicTacToeAI(gameState.aiDifficulty);

// Initialize game
function initGame() {
    createBoard();
    updateDisplay();
    addEventListeners();
    loadSettings();
    updateScoreDisplay();
}

// Create game board
function createBoard() {
    const squares = gameBoard.querySelectorAll('.square');
    squares.forEach((square, index) => {
        square.addEventListener('click', () => handleSquareClick(index));
    });
}

// Handle square click
function handleSquareClick(index) {
    if (gameState.board[index] || gameState.isGameOver || gameState.isAiTurn) return;

    makeMove(index, gameState.currentPlayer);
    
    // If it's AI mode and game isn't over, make AI move
    if (gameState.gameMode === 'ai' && !gameState.isGameOver && gameState.currentPlayer === 'O') {
        gameState.isAiTurn = true;
        showAiThinking();
        
        setTimeout(() => {
            const aiMove = ai.getMove(gameState.board, 'O');
            makeMove(aiMove, 'O');
            hideAiThinking();
            gameState.isAiTurn = false;
        }, Math.random() * 1000 + 500); // Random delay between 500-1500ms
    }
}

// Make a move
function makeMove(index, player) {
    if (gameState.board[index] || gameState.isGameOver) return;

    // Make move
    gameState.board[index] = player;
    
    // Update square display
    const square = gameBoard.children[index];
    square.textContent = player;
    square.classList.add(player.toLowerCase());
    square.classList.add('disabled');

    // Play sound
    if (player === 'O' && gameState.gameMode === 'ai') {
        sounds.aiMove();
    } else {
        sounds.move();
    }

    // Check for winner
    const winner = checkWinner(gameState.board);
    if (winner) {
        gameState.winner = winner;
        gameState.isGameOver = true;
        highlightWinningSquares();
        showCelebration();
        updateStats(winner);
        sounds.win();
    } else if (checkDraw(gameState.board)) {
        gameState.isDraw = true;
        gameState.isGameOver = true;
        showDrawMessage();
        updateStats('draw');
        sounds.draw();
    } else {
        // Switch player
        gameState.currentPlayer = gameState.currentPlayer === 'X' ? 'O' : 'X';
    }

    updateDisplay();
}

// Check for winner
function checkWinner(board) {
    for (const combination of WINNING_COMBINATIONS) {
        const [a, b, c] = combination;
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return null;
}

// Check for draw
function checkDraw(board) {
    return board.every(square => square !== null);
}

// Highlight winning squares
function highlightWinningSquares() {
    for (const combination of WINNING_COMBINATIONS) {
        const [a, b, c] = combination;
        if (gameState.board[a] && 
            gameState.board[a] === gameState.board[b] && 
            gameState.board[a] === gameState.board[c]) {
            
            gameBoard.children[a].classList.add('winning');
            gameBoard.children[b].classList.add('winning');
            gameBoard.children[c].classList.add('winning');
            break;
        }
    }
}

// Show celebration
function showCelebration() {
    const winnerText = gameState.gameMode === 'ai' && gameState.winner === 'O' ? 
                      'AI Wins!' : `Player ${gameState.winner} Wins!`;
    celebrationText.textContent = winnerText;
    celebration.classList.remove('hidden');
    
    // Add trophy icon to status
    const statusContent = gameStatus.querySelector('.status-content');
    if (!statusContent.querySelector('.trophy-icon')) {
        const trophyIcon = document.createElement('svg');
        trophyIcon.className = 'trophy-icon';
        trophyIcon.setAttribute('viewBox', '0 0 24 24');
        trophyIcon.setAttribute('fill', 'none');
        trophyIcon.setAttribute('stroke', 'currentColor');
        trophyIcon.setAttribute('stroke-width', '2');
        trophyIcon.innerHTML = '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55.47.98.97 1.21C12.04 18.75 13 20.24 13 22"/><path d="M14 14.66V17c0 .55-.47.98-.97 1.21C11.96 18.75 11 20.24 11 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>';
        statusContent.insertBefore(trophyIcon, statusContent.firstChild);
    }
}

// Show draw message
function showDrawMessage() {
    drawMessage.classList.remove('hidden');
}

// Show AI thinking
function showAiThinking() {
    aiThinking.classList.remove('hidden');
}

// Hide AI thinking
function hideAiThinking() {
    aiThinking.classList.add('hidden');
}

// Update display
function updateDisplay() {
    // Update status text and styling
    if (gameState.winner) {
        const winnerText = gameState.gameMode === 'ai' && gameState.winner === 'O' ? 
                          'AI Wins!' : `Player ${gameState.winner} Wins!`;
        statusText.textContent = winnerText;
        gameStatus.className = 'game-status status-winner';
    } else if (gameState.isDraw) {
        statusText.textContent = "It's a Draw!";
        gameStatus.className = 'game-status status-draw';
    } else {
        const currentPlayerText = gameState.gameMode === 'ai' && gameState.currentPlayer === 'O' ? 
                                 "AI's Turn" : `Player ${gameState.currentPlayer}'s Turn`;
        statusText.textContent = currentPlayerText;
        gameStatus.className = `game-status status-${gameState.currentPlayer.toLowerCase()}`;
    }

    // Update player indicators
    if (!gameState.isGameOver) {
        if (gameState.currentPlayer === 'X') {
            playerX.classList.add('active');
            playerO.classList.remove('active');
        } else {
            playerO.classList.add('active');
            playerX.classList.remove('active');
        }
    } else {
        playerX.classList.remove('active');
        playerO.classList.remove('active');
    }

    // Disable all squares if game is over
    if (gameState.isGameOver) {
        const squares = gameBoard.querySelectorAll('.square');
        squares.forEach(square => {
            square.classList.add('disabled');
        });
    }
}

// Update statistics
function updateStats(result) {
    if (result === 'X') {
        gameStats.playerX++;
    } else if (result === 'O') {
        gameStats.playerO++;
    } else if (result === 'draw') {
        gameStats.draws++;
    }
    updateScoreDisplay();
    saveSettings();
}

// Update score display
function updateScoreDisplay() {
    scoreX.textContent = gameStats.playerX;
    scoreO.textContent = gameStats.playerO;
    scoreDraw.textContent = gameStats.draws;
}

// Reset game
function resetGame() {
    sounds.click();
    
    // Reset game state
    gameState = {
        board: Array(9).fill(null),
        currentPlayer: 'X',
        winner: null,
        isGameOver: false,
        isDraw: false,
        gameMode: gameState.gameMode,
        aiDifficulty: gameState.aiDifficulty,
        isAiTurn: false
    };

    // Clear board display
    const squares = gameBoard.querySelectorAll('.square');
    squares.forEach(square => {
        square.textContent = '';
        square.className = 'square';
    });

    // Hide messages
    celebration.classList.add('hidden');
    drawMessage.classList.add('hidden');
    hideAiThinking();

    // Remove trophy icon
    const trophyIcon = gameStatus.querySelector('.trophy-icon');
    if (trophyIcon) {
        trophyIcon.remove();
    }

    // Update display
    updateDisplay();
}

// Reset score
function resetScore() {
    sounds.click();
    gameStats = {
        playerX: 0,
        playerO: 0,
        draws: 0
    };
    updateScoreDisplay();
    saveSettings();
}

// Settings functions
function toggleSettings() {
    sounds.click();
    settingsPanel.classList.toggle('open');
}

function closeSettingsPanel() {
    sounds.click();
    settingsPanel.classList.remove('open');
}

function setGameMode(mode) {
    sounds.click();
    gameState.gameMode = mode;
    
    // Update UI
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    
    // Show/hide AI difficulty
    const aiOnlyElements = document.querySelectorAll('.ai-only');
    aiOnlyElements.forEach(el => {
        el.classList.toggle('hidden', mode !== 'ai');
    });
    
    // Update labels
    if (mode === 'ai') {
        playerOLabel.textContent = 'AI';
        playerOIndicator.textContent = 'AI';
    } else {
        playerOLabel.textContent = 'Player O';
        playerOIndicator.textContent = 'Player O';
    }
    
    saveSettings();
    resetGame();
}

function setAiDifficulty(difficulty) {
    sounds.click();
    gameState.aiDifficulty = difficulty;
    ai.difficulty = difficulty;
    
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.difficulty === difficulty);
    });
    
    saveSettings();
}

function setTheme(theme) {
    sounds.click();
    settings.theme = theme;
    document.body.setAttribute('data-theme', theme);
    
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.theme === theme);
    });
    
    saveSettings();
}

function toggleSound() {
    settings.soundEnabled = !settings.soundEnabled;
    
    soundToggle.classList.toggle('active', settings.soundEnabled);
    soundToggle.querySelector('.sound-text').textContent = settings.soundEnabled ? 'ON' : 'OFF';
    soundToggle.querySelector('.sound-icon').textContent = settings.soundEnabled ? '🔊' : '🔇';
    
    if (settings.soundEnabled) {
        sounds.click();
    }
    
    saveSettings();
}

function toggleMusic() {
    settings.musicEnabled = !settings.musicEnabled;
    
    musicToggle.classList.toggle('active', settings.musicEnabled);
    musicToggle.querySelector('.music-text').textContent = settings.musicEnabled ? 'ON' : 'OFF';
    
    if (settings.musicEnabled) {
        backgroundMusic.play();
        backgroundMusic.volume = settings.volume / 100 * 0.3;
    } else {
        backgroundMusic.pause();
    }
    
    sounds.click();
    saveSettings();
}

function updateVolume() {
    settings.volume = parseInt(volumeSlider.value);
    volumeValue.textContent = settings.volume + '%';
    
    if (settings.musicEnabled) {
        backgroundMusic.volume = settings.volume / 100 * 0.3;
    }
    
    saveSettings();
}

// Save settings to localStorage
function saveSettings() {
    const dataToSave = {
        settings: settings,
        gameStats: gameStats,
        gameMode: gameState.gameMode,
        aiDifficulty: gameState.aiDifficulty
    };
    localStorage.setItem('ticTacToeData', JSON.stringify(dataToSave));
}

// Load settings from localStorage
function loadSettings() {
    const savedData = localStorage.getItem('ticTacToeData');
    if (savedData) {
        const data = JSON.parse(savedData);
        
        // Load settings
        if (data.settings) {
            settings = { ...settings, ...data.settings };
        }
        
        // Load game stats
        if (data.gameStats) {
            gameStats = { ...gameStats, ...data.gameStats };
        }
        
        // Load game preferences
        if (data.gameMode) {
            gameState.gameMode = data.gameMode;
        }
        
        if (data.aiDifficulty) {
            gameState.aiDifficulty = data.aiDifficulty;
            ai.difficulty = data.aiDifficulty;
        }
        
        // Apply settings to UI
        setTheme(settings.theme);
        setGameMode(gameState.gameMode);
        setAiDifficulty(gameState.aiDifficulty);
        
        // Update sound settings
        soundToggle.classList.toggle('active', settings.soundEnabled);
        soundToggle.querySelector('.sound-text').textContent = settings.soundEnabled ? 'ON' : 'OFF';
        soundToggle.querySelector('.sound-icon').textContent = settings.soundEnabled ? '🔊' : '🔇';
        
        musicToggle.classList.toggle('active', settings.musicEnabled);
        musicToggle.querySelector('.music-text').textContent = settings.musicEnabled ? 'ON' : 'OFF';
        
        volumeSlider.value = settings.volume;
        volumeValue.textContent = settings.volume + '%';
        
        updateScoreDisplay();
    }
}

// Add event listeners
function addEventListeners() {
    // Game controls
    newGameBtn.addEventListener('click', resetGame);
    resetScoreBtn.addEventListener('click', resetScore);
    
    // Settings
    settingsBtn.addEventListener('click', toggleSettings);
    closeSettings.addEventListener('click', closeSettingsPanel);
    
    // Game mode buttons
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', () => setGameMode(btn.dataset.mode));
    });
    
    // Difficulty buttons
    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.addEventListener('click', () => setAiDifficulty(btn.dataset.difficulty));
    });
    
    // Theme buttons
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => setTheme(btn.dataset.theme));
    });
    
    // Sound controls
    soundToggle.addEventListener('click', toggleSound);
    musicToggle.addEventListener('click', toggleMusic);
    volumeSlider.addEventListener('input', updateVolume);
    
    // Close settings when clicking outside
    document.addEventListener('click', (e) => {
        if (!settingsPanel.contains(e.target) && !settingsBtn.contains(e.target)) {
            settingsPanel.classList.remove('open');
        }
    });
}

// Keyboard support
document.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') {
        resetGame();
    }
    
    if (e.key === 's' || e.key === 'S') {
        toggleSettings();
    }
    
    if (e.key === 'Escape') {
        closeSettingsPanel();
    }
    
    // Number keys 1-9 for square selection
    const num = parseInt(e.key);
    if (num >= 1 && num <= 9) {
        handleSquareClick(num - 1);
    }
});

// Touch support for mobile
let touchStartTime = 0;
gameBoard.addEventListener('touchstart', (e) => {
    touchStartTime = Date.now();
});

gameBoard.addEventListener('touchend', (e) => {
    const touchDuration = Date.now() - touchStartTime;
    if (touchDuration < 200) { // Quick tap
        e.preventDefault();
    }
});

// Prevent zoom on double tap for mobile
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        e.preventDefault();
    }
    lastTouchEnd = now;
}, false);

// Initialize the game when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initGame();
    
    // Initialize audio context on first user interaction
    document.addEventListener('click', () => {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }, { once: true });
});