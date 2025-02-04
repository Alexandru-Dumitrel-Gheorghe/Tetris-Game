import React, { useState, useEffect, useCallback, useRef } from "react";
import Board from "./Board";
import { TETROMINOES } from "./Tetrominoes";

/** Creates a 20x10 (row x column) matrix filled with 0s. */
const createEmptyBoard = () =>
  Array.from({ length: 20 }, () => Array(10).fill(0));

/** Returns a random tetromino from TETROMINOES (excluding "0"). */
const randomTetromino = () => {
  const tetrominoKeys = Object.keys(TETROMINOES).filter((key) => key !== "0");
  const randomKey = tetrominoKeys[Math.floor(Math.random() * tetrominoKeys.length)];
  return TETROMINOES[randomKey];
};

const Game = () => {
  const [board, setBoard] = useState(createEmptyBoard());
  const [currentPiece, setCurrentPiece] = useState(randomTetromino());
  const [position, setPosition] = useState({ x: 4, y: 0 });
  const [score, setScore] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const gameInterval = useRef(null);

  /** Draws the current piece on a copy of the board, returning the new board. */
  const drawPiece = useCallback(() => {
    const newBoard = board.map((row) => [...row]);
    currentPiece.shape.forEach((row, y) => {
      row.forEach((cell, x) => {
        if (cell !== 0) {
          const newX = x + position.x;
          const newY = y + position.y;
          if (newY >= 0 && newY < 20 && newX >= 0 && newX < 10) {
            newBoard[newY][newX] = cell;
          }
        }
      });
    });
    return newBoard;
  }, [board, currentPiece, position]);

  /**
   * Checks if the piece collides with edges or occupied cells.
   * @param piece   => piece (e.g., currentPiece)
   * @param board   => board (2D array)
   * @param pos     => position { x, y }
   */
  const checkCollision = (piece, board, pos) => {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x] !== 0) {
          const newX = x + pos.x;
          const newY = y + pos.y;

          // If it goes out of bounds or the spot is already occupied
          if (
            newX < 0 ||
            newX >= 10 ||
            newY >= 20 ||
            (newY >= 0 && board[newY][newX] !== 0)
          ) {
            return true;
          }
        }
      }
    }
    return false;
  };

  /**
   * Clears complete rows. Returns the new board, and the score is updated
   * by 100 points per row cleared.
   */
  const clearRows = (boardToCheck) => {
    let clearedRows = 0;
    const newBoard = boardToCheck.reduce((acc, row) => {
      if (row.every((cell) => cell !== 0)) {
        clearedRows++;
        acc.unshift(Array(10).fill(0));
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

  /** Keyboard controls, active only if the game is running. */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isRunning) return; // Ignore keys if the game is paused or stopped

      if (e.key === "ArrowLeft") {
        // Move left
        if (!checkCollision(currentPiece, board, { x: position.x - 1, y: position.y })) {
          setPosition((prev) => ({ ...prev, x: prev.x - 1 }));
        }
      } else if (e.key === "ArrowRight") {
        // Move right
        if (!checkCollision(currentPiece, board, { x: position.x + 1, y: position.y })) {
          setPosition((prev) => ({ ...prev, x: prev.x + 1 }));
        }
      } else if (e.key === "ArrowDown") {
        // Fast drop
        if (!checkCollision(currentPiece, board, { x: position.x, y: position.y + 1 })) {
          setPosition((prev) => ({ ...prev, y: prev.y + 1 }));
        }
      } else if (e.key === "ArrowUp") {
        // Rotate clockwise
        const rotatedShape = currentPiece.shape[0].map((_, idx) =>
          currentPiece.shape.map((row) => row[idx]).reverse()
        );
        const newPiece = { ...currentPiece, shape: rotatedShape };
        if (!checkCollision(newPiece, board, position)) {
          setCurrentPiece(newPiece);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPiece, position, board, isRunning]);

  /** The function that drops the piece automatically at fixed intervals. */
  const gameLoop = useCallback(() => {
    if (!isRunning) return;

    // Check if we can move the piece down by 1 on the Y-axis
    if (!checkCollision(currentPiece, board, { x: position.x, y: position.y + 1 })) {
      setPosition((prev) => ({ ...prev, y: prev.y + 1 }));
    } else {
      // Fix the piece on the board
      const updatedBoard = board.map((row) => [...row]);
      currentPiece.shape.forEach((row, y) => {
        row.forEach((cell, x) => {
          if (cell !== 0) {
            const newX = x + position.x;
            const newY = y + position.y;
            if (newY >= 0 && newY < 20 && newX >= 0 && newX < 10) {
              updatedBoard[newY][newX] = cell;
            }
          }
        });
      });

      // Clear full lines
      const clearedBoard = clearRows(updatedBoard);
      setBoard(clearedBoard);

      // Generate a new piece
      const newPiece = randomTetromino();
      setCurrentPiece(newPiece);
      setPosition({ x: 4, y: 0 });

      // Check for immediate collision (game over)
      if (checkCollision(newPiece, clearedBoard, { x: 4, y: 0 })) {
        alert(`Game Over! Final score: ${score}`);
        // Reset the game
        setIsRunning(false);
        setBoard(createEmptyBoard());
        setScore(0);
      }
    }
  }, [isRunning, currentPiece, board, position, score]);

  /** useEffect to start/stop the game loop interval. */
  useEffect(() => {
    if (isRunning) {
      gameInterval.current = setInterval(() => {
        gameLoop();
      }, 500);
    }
    return () => {
      if (gameInterval.current) clearInterval(gameInterval.current);
    };
  }, [isRunning, gameLoop]);

  /** Start button: Initializes and starts the game if it's stopped. */
  const handleStart = () => {
    if (isRunning) return; // Do nothing if the game is already running

    // Reset the game before starting, if we want a "clean restart"
    setBoard(createEmptyBoard());
    setScore(0);
    setCurrentPiece(randomTetromino());
    setPosition({ x: 4, y: 0 });
    setIsRunning(true);
  };

  /** Pause button: Pauses/resumes the game. */
  const handlePause = () => {
    setIsRunning((prev) => !prev);
  };

  /** Stop button: Stops the game and resets the state. */
  const handleStop = () => {
    setIsRunning(false);
    setBoard(createEmptyBoard());
    setScore(0);
  };

  return (
    <div className="game-container">
      <h1>Tetris</h1>
      <p>Score: {score}</p>

      <div className="game-controls">
        <button onClick={handleStart}>Start</button>
        <button onClick={handlePause}>{isRunning ? "Pause" : "Continue"}</button>
        <button onClick={handleStop}>Stop</button>
      </div>

      <Board board={drawPiece()} />
      
      <p className="author-credit">Developed by Alexandru Gheorghe</p>
    </div>
  );
};

export default Game;
