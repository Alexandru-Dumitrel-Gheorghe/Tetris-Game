import React, { useState, useEffect, useCallback, useRef } from "react";
import Board from "./Board";
import { TETROMINOES } from "./Tetrominoes";

/** Creează o matrice 20x10 (linie x coloană) plină cu 0. */
const createEmptyBoard = () =>
  Array.from({ length: 20 }, () => Array(10).fill(0));

/** Întoarce un tetromino random din TETROMINOES (excluzând "0"). */
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

  // Nou: stare pentru joc pornit/în pauză/oprit
  const [isRunning, setIsRunning] = useState(false);

  // Referință la intervalul de joc (pentru coborârea automată)
  const gameInterval = useRef(null);

  /** Desenează piesa curentă pe o copie a tablei, returnând noua tabla. */
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
   * Verifică coliziunea piesei cu margini sau cu celule ocupate.
   * @param piece   => piesa (de ex. currentPiece)
   * @param board   => tabla (array 2D)
   * @param pos     => poziția { x, y }
   */
  const checkCollision = (piece, board, pos) => {
    for (let y = 0; y < piece.shape.length; y++) {
      for (let x = 0; x < piece.shape[y].length; x++) {
        if (piece.shape[y][x] !== 0) {
          const newX = x + pos.x;
          const newY = y + pos.y;

          // Dacă iese din tablou sau locul e deja ocupat
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
   * Șterge liniile complete. Returnează noua tablă, iar scorul e actualizat
   * cu 100 de puncte per linie ștearsă.
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

  /** Manevrele cu tastatura, active doar dacă jocul rulează. */
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isRunning) return; // dacă jocul e în pauză sau oprit, ignorăm tastele

      if (e.key === "ArrowLeft") {
        // Mută la stânga
        if (!checkCollision(currentPiece, board, { x: position.x - 1, y: position.y })) {
          setPosition((prev) => ({ ...prev, x: prev.x - 1 }));
        }
      } else if (e.key === "ArrowRight") {
        // Mută la dreapta
        if (!checkCollision(currentPiece, board, { x: position.x + 1, y: position.y })) {
          setPosition((prev) => ({ ...prev, x: prev.x + 1 }));
        }
      } else if (e.key === "ArrowDown") {
        // Coborâre rapidă
        if (!checkCollision(currentPiece, board, { x: position.x, y: position.y + 1 })) {
          setPosition((prev) => ({ ...prev, y: prev.y + 1 }));
        }
      } else if (e.key === "ArrowUp") {
        // Rotire în sens orar
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

  /** Funcția care coboară piesa automat, la interval fix. */
  const gameLoop = useCallback(() => {
    if (!isRunning) return;

    // Verificăm dacă putem coborî piesa cu 1 pe axa Y
    if (!checkCollision(currentPiece, board, { x: position.x, y: position.y + 1 })) {
      setPosition((prev) => ({ ...prev, y: prev.y + 1 }));
    } else {
      // Fixăm piesa în tablă
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

      // Ștergem liniile complete
      const clearedBoard = clearRows(updatedBoard);
      setBoard(clearedBoard);

      // Generăm o piesă nouă
      const newPiece = randomTetromino();
      setCurrentPiece(newPiece);
      setPosition({ x: 4, y: 0 });

      // Verificăm coliziunea imediată (game over)
      if (checkCollision(newPiece, clearedBoard, { x: 4, y: 0 })) {
        alert(`Game Over! Scor final: ${score}`);
        // Resetăm jocul
        setIsRunning(false);
        setBoard(createEmptyBoard());
        setScore(0);
      }
    }
  }, [isRunning, currentPiece, board, position, score]);

  /** useEffect pentru a porni / opri intervalul. */
  useEffect(() => {
    // La fiecare pornire a jocului, setăm intervalul
    if (isRunning) {
      gameInterval.current = setInterval(() => {
        gameLoop();
      }, 500);
    }
    // Curățăm intervalul la oprire sau la demontare
    return () => {
      if (gameInterval.current) clearInterval(gameInterval.current);
    };
  }, [isRunning, gameLoop]);

  /** Buton Start: Inițializează jocul dacă e oprit și pornește. */
  const handleStart = () => {
    // Dacă jocul e deja în desfășurare, nu facem nimic
    if (isRunning) return;

    // Resetăm jocul înainte de start, dacă dorim un "restart" curat
    setBoard(createEmptyBoard());
    setScore(0);
    setCurrentPiece(randomTetromino());
    setPosition({ x: 4, y: 0 });
    setIsRunning(true);
  };

  /** Buton Pauză: întrerupe / reia jocul. */
  const handlePause = () => {
    // Dacă e pornit => punem pauză. Dacă e în pauză => repornim.
    setIsRunning((prev) => !prev);
  };

  /** Buton Stop: oprește jocul și resetează starea. */
  const handleStop = () => {
    setIsRunning(false);
    setBoard(createEmptyBoard());
    setScore(0);
  };
  // ... restul codului

return (
    <div className="game-container">
      
      <p>Scor: {score}</p>
  
      <div className="game-controls">
        <button onClick={handleStart}>Start</button>
        <button onClick={handlePause}>{isRunning ? "Pauză" : "Continuă"}</button>
        <button onClick={handleStop}>Stop</button>
      </div>
  
      <Board board={drawPiece()} />
  
      {/* Aici afișăm numele autorului */}
      <p className="author-credit">Developed by Alexandru Gheorghe</p>
    </div>
  );
  

  return (
    <div className="game-container">
      <h1>Tetris</h1>
      <p>Scor: {score}</p>

      {/* Butoane de control */}
      <div className="game-controls">
        <button onClick={handleStart}>Start</button>
        <button onClick={handlePause}>{isRunning ? "Pauză" : "Continuă"}</button>
        <button onClick={handleStop}>Stop</button>
      </div>

      {/* Afișăm tabla cu piesa desenată */}
      <Board board={drawPiece()} />
    </div>
  );
};

export default Game;
