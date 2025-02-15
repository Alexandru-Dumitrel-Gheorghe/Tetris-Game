import React, { useState, useEffect, useCallback, useRef } from "react";
import Board from "./Board";
import { TETROMINOES } from "./Tetrominoes";

// Standard board dimensions
const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;

// Creates an empty board of BOARD_HEIGHT x BOARD_WIDTH
const createEmptyBoard = () =>
  Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0));

// Returns a random tetromino (excluding the "0" piece)
const randomTetromino = () => {
  const tetrominoKeys = Object.keys(TETROMINOES).filter((key) => key !== "0");
  const randomKey =
    tetrominoKeys[Math.floor(Math.random() * tetrominoKeys.length)];
  return TETROMINOES[randomKey];
};

const Game = () => {
  // Calculate the initial position to center the piece on the board
  const getInitialPosition = (piece) => ({
    x: Math.floor((BOARD_WIDTH - piece.shape[0].length) / 2),
    y: 0,
  });

  const [board, setBoard] = useState(createEmptyBoard());
  const initialPiece = randomTetromino();
  const [currentPiece, setCurrentPiece] = useState(initialPiece);
  const [position, setPosition] = useState(getInitialPosition(initialPiece));
  const [score, setScore] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  const gameInterval = useRef(null);

  // Check collision for a given piece at a given position on the board
  const checkCollision = (piece, board, pos) => {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x] !== 0) {
          const newX = x + pos.x;
          const newY = y + pos.y;
          if (
            newX < 0 ||
            newX >= BOARD_WIDTH ||
            newY >= BOARD_HEIGHT ||
            (newY >= 0 && board[newY][newX] !== 0)
          ) {
            return true;
          }
        }
      }
    }
    return false;
  };

  // Draw the board, including the ghost piece and the current piece
  const drawBoard = useCallback(() => {
    const newBoard = board.map((row) => [...row]);

    // Calculate ghost piece position: drop the piece until collision occurs
    let ghostY = position.y;
    while (
      !checkCollision(currentPiece, newBoard, { x: position.x, y: ghostY + 1 })
    ) {
      ghostY++;
    }

    // Draw ghost piece (using the "ghost-" prefix)
    currentPiece.shape.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell !== 0) {
          const boardX = x + position.x;
          const boardY = y + ghostY;
          if (
            boardY >= 0 &&
            boardY < BOARD_HEIGHT &&
            boardX >= 0 &&
            boardX < BOARD_WIDTH &&
            newBoard[boardY][boardX] === 0
          ) {
            newBoard[boardY][boardX] = "ghost-" + cell;
          }
        }
      });
    });

    // Draw the current piece over the ghost piece
    currentPiece.shape.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell !== 0) {
          const boardX = x + position.x;
          const boardY = y + position.y;
          if (
            boardY >= 0 &&
            boardY < BOARD_HEIGHT &&
            boardX >= 0 &&
            boardX < BOARD_WIDTH
          ) {
            newBoard[boardY][boardX] = cell;
          }
        }
      });
    });

    return newBoard;
  }, [board, currentPiece, position]);

  // Clear complete rows and update the score (100 points per row)
  const clearRows = (boardToCheck) => {
    let clearedRows = 0;
    const newBoard = boardToCheck.reduce((acc, row) => {
      if (row.every((cell) => cell !== 0)) {
        clearedRows++;
        acc.unshift(Array(BOARD_WIDTH).fill(0));
      } else {
        acc.push(row);
      }
      return acc;
    }, []);

    if (clearedRows > 0) {
      setScore((prev) => prev + clearedRows * 100);
    }
    return newBoard;
  };

  // Movement and rotation controls using useCallback

  const handleLeft = useCallback(() => {
    if (!checkCollision(currentPiece, board, { x: position.x - 1, y: position.y })) {
      setPosition((prev) => ({ ...prev, x: prev.x - 1 }));
    }
  }, [currentPiece, board, position]);

  const handleRight = useCallback(() => {
    if (!checkCollision(currentPiece, board, { x: position.x + 1, y: position.y })) {
      setPosition((prev) => ({ ...prev, x: prev.x + 1 }));
    }
  }, [currentPiece, board, position]);

  const handleDown = useCallback(() => {
    if (!checkCollision(currentPiece, board, { x: position.x, y: position.y + 1 })) {
      setPosition((prev) => ({ ...prev, y: prev.y + 1 }));
    }
  }, [currentPiece, board, position]);

  // Rotate the piece with wall kick logic
  const handleRotate = useCallback(() => {
    const rotatedShape = currentPiece.shape[0].map((_, idx) =>
      currentPiece.shape.map((row) => row[idx]).reverse()
    );
    const rotatedPiece = { ...currentPiece, shape: rotatedShape };

    // Offsets for wall kick
    const offsets = [0, -1, 1, -2, 2];
    let newX = position.x;
    let canRotate = false;

    for (let offset of offsets) {
      if (!checkCollision(rotatedPiece, board, { x: position.x + offset, y: position.y })) {
        newX = position.x + offset;
        canRotate = true;
        break;
      }
    }

    if (canRotate) {
      setCurrentPiece(rotatedPiece);
      setPosition((prev) => ({ ...prev, x: newX }));
    }
  }, [currentPiece, board, position]);

  // Keyboard events for desktop
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isRunning || isGameOver) return;
      if (e.key === "ArrowLeft") {
        handleLeft();
      } else if (e.key === "ArrowRight") {
        handleRight();
      } else if (e.key === "ArrowDown") {
        handleDown();
      } else if (e.key === "ArrowUp") {
        handleRotate();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isRunning, isGameOver, handleLeft, handleRight, handleDown, handleRotate]);

  // Main game loop
  const gameLoop = useCallback(() => {
    if (!isRunning || isGameOver) return;

    if (!checkCollision(currentPiece, board, { x: position.x, y: position.y + 1 })) {
      setPosition((prev) => ({ ...prev, y: prev.y + 1 }));
    } else {
      // Fix the piece on the board
      const updatedBoard = board.map((row) => [...row]);
      currentPiece.shape.forEach((row, y) => {
        row.forEach((cell, x) => {
          if (cell !== 0) {
            const boardX = x + position.x;
            const boardY = y + position.y;
            if (
              boardY >= 0 &&
              boardY < BOARD_HEIGHT &&
              boardX >= 0 &&
              boardX < BOARD_WIDTH
            ) {
              updatedBoard[boardY][boardX] = cell;
            }
          }
        });
      });

      // Clear complete rows
      const clearedBoard = clearRows(updatedBoard);
      setBoard(clearedBoard);

      // Generate a new tetromino and reset its position
      const newPiece = randomTetromino();
      setCurrentPiece(newPiece);
      setPosition(getInitialPosition(newPiece));

      // Check for game over
      if (
        checkCollision(newPiece, clearedBoard, {
          x: getInitialPosition(newPiece).x,
          y: 0,
        })
      ) {
        setIsGameOver(true);
        setIsRunning(false);
      }
    }
  }, [isRunning, isGameOver, currentPiece, board, position]);

  useEffect(() => {
    if (isRunning && !isGameOver) {
      gameInterval.current = setInterval(() => {
        gameLoop();
      }, 500);
    }
    return () => {
      if (gameInterval.current) clearInterval(gameInterval.current);
    };
  }, [isRunning, isGameOver, gameLoop]);

  // Control button handlers
  const handleStart = () => {
    if (isRunning) return;
    const newPiece = randomTetromino();
    setBoard(createEmptyBoard());
    setScore(0);
    setCurrentPiece(newPiece);
    setPosition(getInitialPosition(newPiece));
    setIsRunning(true);
    setIsGameOver(false);
  };

  const handlePause = () => {
    if (isGameOver) return;
    setIsRunning((prev) => !prev);
  };

  const handleStop = () => {
    setIsRunning(false);
    setBoard(createEmptyBoard());
    setScore(0);
    setIsGameOver(false);
  };

  // Restart after game over
  const handleRestart = () => {
    setIsGameOver(false);
    const newPiece = randomTetromino();
    setBoard(createEmptyBoard());
    setScore(0);
    setCurrentPiece(newPiece);
    setPosition(getInitialPosition(newPiece));
    setIsRunning(true);
  };

  return (
    <div className="game-container">
      <h1 className="game-title">Tetris</h1>
      <p className="score-display">Score: {score}</p>

      <div className="game-controls">
        <button onClick={handleStart}>Start</button>
        <button onClick={handlePause}>
          {isRunning && !isGameOver ? "Pause" : "Continue"}
        </button>
        <button onClick={handleStop}>Stop</button>
      </div>

      <Board board={drawBoard()} />

      {/* Touch controls */}
      <div className="touch-controls">
        <button onClick={handleLeft}>Left</button>
        <button onClick={handleRotate}>Rotate</button>
        <button onClick={handleRight}>Right</button>
        <button onClick={handleDown}>Down</button>
      </div>

      {/* Game Over overlay */}
      {isGameOver && (
        <div className="game-over-overlay">
          <div className="game-over-content">
            <h2>Game Over</h2>
            <p>Final Score: {score}</p>
            <button onClick={handleRestart}>Restart</button>
          </div>
        </div>
      )}

      <p className="author-credit">Developed by Alexandru Gheorghe</p>
    </div>
  );
};

export default Game;
