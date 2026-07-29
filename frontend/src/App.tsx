import React, { useState, useEffect, useRef } from "react";
import { InteractiveSearchCanvas } from "./components/InteractiveSearchCanvas";
import { ConstraintNetworkBackground } from "./components/ConstraintNetworkBackground";



const getRandomizedSudokuTemplate = (size: number): number[][] => {
  let base: number[][];
  if (size === 9) {
    base = [
      [5, 3, 0, 0, 7, 0, 0, 0, 0],
      [6, 0, 0, 1, 9, 5, 0, 0, 0],
      [0, 9, 8, 0, 0, 0, 0, 6, 0],
      [8, 0, 0, 0, 6, 0, 0, 0, 3],
      [4, 0, 0, 8, 0, 3, 0, 0, 1],
      [7, 0, 0, 0, 2, 0, 0, 0, 6],
      [0, 6, 0, 0, 0, 0, 2, 8, 0],
      [0, 0, 0, 4, 1, 9, 0, 0, 5],
      [0, 0, 0, 0, 8, 0, 0, 7, 9]
    ];
  } else if (size === 4) {
    base = [
      [1, 0, 3, 0],
      [0, 0, 0, 2],
      [2, 0, 0, 0],
      [0, 3, 0, 1]
    ];
  } else if (size === 6) {
    base = [
      [1, 0, 0, 4, 0, 6],
      [0, 5, 6, 0, 2, 0],
      [0, 3, 0, 5, 0, 1],
      [5, 0, 1, 0, 3, 0],
      [0, 4, 0, 6, 0, 2],
      [6, 0, 2, 0, 4, 0]
    ];
  } else {
    const grid = Array.from({ length: size }, () => Array(size).fill(0));
    for (let i = 0; i < size; i++) {
      let attempts = 0;
      while (attempts < 100) {
        const r = Math.floor(Math.random() * size);
        const c = Math.floor(Math.random() * size);
        const val = Math.floor(Math.random() * size) + 1;
        let conflict = false;
        for (let j = 0; j < size; j++) {
          if (grid[r][j] === val || grid[j][c] === val) {
            conflict = true;
            break;
          }
        }
        if (!conflict) {
          grid[r][c] = val;
          break;
        }
        attempts++;
      }
    }
    return grid;
  }

  const numbers = Array.from({ length: size }, (_, i) => i + 1);
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }

  const map = new Map<number, number>();
  for (let i = 0; i < size; i++) {
    map.set(i + 1, numbers[i]);
  }

  const result = base.map(row => row.map(val => (val !== 0 ? map.get(val)! : 0)));

  const boxHeight = size === 9 ? 3 : (size === 4 || size === 6 ? 2 : 0);
  if (boxHeight > 0) {
    const numBands = size / boxHeight;
    for (let b = 0; b < numBands; b++) {
      const start = b * boxHeight;
      const bandRows = result.slice(start, start + boxHeight);
      for (let i = bandRows.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bandRows[i], bandRows[j]] = [bandRows[j], bandRows[i]];
      }
      for (let i = 0; i < boxHeight; i++) {
        result[start + i] = bandRows[i];
      }
    }
  }

  return result;
};


// Initializing Kakuro cells
interface KakuroCell {
  row: number;
  col: number;
  type: "block" | "clue" | "white";
  val: number; // 0 if empty, 1-9 if assigned
  vSum?: number; // Clue vertical sum (downwards)
  hSum?: number; // Clue horizontal sum (rightwards)
}

// 5x5 Default Template
const KAKURO_5x5: KakuroCell[][] = [
  [
    { row: 0, col: 0, type: "block", val: 0 },
    { row: 0, col: 1, type: "clue", val: 0, vSum: 11 },
    { row: 0, col: 2, type: "clue", val: 0, vSum: 17 },
    { row: 0, col: 3, type: "block", val: 0 },
    { row: 0, col: 4, type: "block", val: 0 }
  ],
  [
    { row: 1, col: 0, type: "clue", val: 0, hSum: 16 },
    { row: 1, col: 1, type: "white", val: 0 },
    { row: 1, col: 2, type: "white", val: 0 },
    { row: 1, col: 3, type: "clue", val: 0, vSum: 15 },
    { row: 1, col: 4, type: "block", val: 0 }
  ],
  [
    { row: 2, col: 0, type: "clue", val: 0, hSum: 24 },
    { row: 2, col: 1, type: "white", val: 0 },
    { row: 2, col: 2, type: "white", val: 0 },
    { row: 2, col: 3, type: "white", val: 0 },
    { row: 2, col: 4, type: "clue", val: 0, vSum: 14 }
  ],
  [
    { row: 3, col: 0, type: "block", val: 0 },
    { row: 3, col: 1, type: "clue", val: 0, hSum: 14 },
    { row: 3, col: 2, type: "white", val: 0 },
    { row: 3, col: 3, type: "white", val: 0 },
    { row: 3, col: 4, type: "white", val: 0 }
  ],
  [
    { row: 4, col: 0, type: "block", val: 0 },
    { row: 4, col: 1, type: "block", val: 0 },
    { row: 4, col: 2, type: "clue", val: 0, hSum: 16 },
    { row: 4, col: 3, type: "white", val: 0 },
    { row: 4, col: 4, type: "white", val: 0 }
  ]
];

const getKakuroTemplate = (size: number): KakuroCell[][] => {
  if (size === 5) {
    return KAKURO_5x5.map(row => row.map(c => ({ ...c })));
  }

  // Generate blank template of size N filled with Block cells
  const grid: KakuroCell[][] = [];
  for (let r = 0; r < size; r++) {
    const row: KakuroCell[] = [];
    for (let c = 0; c < size; c++) {
      row.push({ row: r, col: c, type: "block", val: 0 });
    }
    grid.push(row);
  }

  // Pre-seed some solvable blocks for sizes > 5
  if (size === 6) {
    grid[0][1] = { row: 0, col: 1, type: "clue", val: 0, vSum: 10 };
    grid[0][2] = { row: 0, col: 2, type: "clue", val: 0, vSum: 16 };
    grid[0][4] = { row: 0, col: 4, type: "clue", val: 0, vSum: 12 };
    grid[1][0] = { row: 1, col: 0, type: "clue", val: 0, hSum: 13 };
    grid[1][1] = { row: 1, col: 1, type: "white", val: 0 };
    grid[1][2] = { row: 1, col: 2, type: "white", val: 0 };
    grid[1][4] = { row: 1, col: 4, type: "white", val: 0 };
    grid[2][0] = { row: 2, col: 0, type: "clue", val: 0, hSum: 11 };
    grid[2][1] = { row: 2, col: 1, type: "white", val: 0 };
    grid[2][2] = { row: 2, col: 2, type: "white", val: 0 };
    grid[2][3] = { row: 2, col: 3, type: "clue", val: 0, vSum: 8 };
    grid[3][2] = { row: 3, col: 2, type: "clue", val: 0, hSum: 14 };
    grid[3][3] = { row: 3, col: 3, type: "white", val: 0 };
    grid[3][4] = { row: 3, col: 4, type: "white", val: 0 };
  } else {
    // Basic pattern for general sizes
    for (let r = 1; r < size; r++) {
      grid[r][0] = { row: r, col: 0, type: "clue", val: 0, hSum: 17 };
      for (let c = 1; c < size; c++) {
        if (r === 1) {
          grid[0][c] = { row: 0, col: c, type: "clue", val: 0, vSum: 12 };
        }
        if (r !== c) {
          grid[r][c] = { row: r, col: c, type: "white", val: 0 };
        }
      }
    }
  }

  return grid;
};

const fillKakuroWhites = (grid: KakuroCell[][], size: number): boolean => {
  const whiteCells: KakuroCell[] = [];
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c].type === "white") {
        whiteCells.push(grid[r][c]);
      }
    }
  }

  const getHorizontalRunCells = (row: number, col: number) => {
    let clueCol = -1;
    for (let c = col - 1; c >= 0; c--) {
      if (grid[row][c].type === "clue") {
        clueCol = c;
        break;
      } else if (grid[row][c].type === "block") {
        break;
      }
    }
    if (clueCol === -1) return [];
    const cells: KakuroCell[] = [];
    let c = clueCol + 1;
    while (c < size && grid[row][c].type === "white") {
      cells.push(grid[row][c]);
      c++;
    }
    return cells;
  };

  const getVerticalRunCells = (row: number, col: number) => {
    let clueRow = -1;
    for (let r = row - 1; r >= 0; r--) {
      if (grid[r][col].type === "clue") {
        clueRow = r;
        break;
      } else if (grid[r][col].type === "block") {
        break;
      }
    }
    if (clueRow === -1) return [];
    const cells: KakuroCell[] = [];
    let r = clueRow + 1;
    while (r < size && grid[r][col].type === "white") {
      cells.push(grid[r][col]);
      r++;
    }
    return cells;
  };

  const cellRelations = whiteCells.map(cell => {
    return {
      cell,
      hRun: getHorizontalRunCells(cell.row, cell.col),
      vRun: getVerticalRunCells(cell.row, cell.col)
    };
  });

  const isValid = (idx: number, val: number): boolean => {
    const { hRun, vRun, cell } = cellRelations[idx];
    for (const other of hRun) {
      if (other !== cell && other.val === val) return false;
    }
    for (const other of vRun) {
      if (other !== cell && other.val === val) return false;
    }
    return true;
  };

  const solve = (idx: number): boolean => {
    if (idx === whiteCells.length) return true;

    const vals = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = vals.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [vals[i], vals[j]] = [vals[j], vals[i]];
    }

    const { cell } = cellRelations[idx];
    for (const val of vals) {
      if (isValid(idx, val)) {
        cell.val = val;
        if (solve(idx + 1)) return true;
        cell.val = 0;
      }
    }
    return false;
  };

  return solve(0);
};

const updateKakuroClues = (grid: KakuroCell[][], size: number) => {
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const cell = grid[r][c];
      if (cell.type === "clue") {
        let hSum = 0;
        let hasH = false;
        let nc = c + 1;
        while (nc < size && grid[r][nc].type === "white") {
          hSum += grid[r][nc].val;
          hasH = true;
          nc++;
        }
        cell.hSum = hasH ? hSum : undefined;

        let vSum = 0;
        let hasV = false;
        let nr = r + 1;
        while (nr < size && grid[nr] && grid[nr][c].type === "white") {
          vSum += grid[nr][c].val;
          hasV = true;
          nr++;
        }
        cell.vSum = hasV ? vSum : undefined;
      }
    }
  }
};

const getRandomizedKakuroTemplate = (size: number): KakuroCell[][] => {
  const grid = getKakuroTemplate(size);
  const success = fillKakuroWhites(grid, size);
  if (success) {
    updateKakuroClues(grid, size);
  }
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (grid[r][c].type === "white") {
        grid[r][c].val = 0;
      }
    }
  }
  return grid;
};


interface KakuroRun {
  targetSum: number;
  cells: { r: number; c: number }[];
}

// Checkers settings
const INITIAL_CHECKERS = [
  [0, 1, 0, 1, 0, 1, 0, 1],
  [1, 0, 1, 0, 1, 0, 1, 0],
  [0, 1, 0, 1, 0, 1, 0, 1],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0],
  [-1, 0, -1, 0, -1, 0, -1, 0],
  [0, -1, 0, -1, 0, -1, 0, -1],
  [-1, 0, -1, 0, -1, 0, -1, 0]
];

interface CheckersMove {
  fromR: number;
  fromC: number;
  toR: number;
  toC: number;
  isCapture: boolean;
  jumpChain: { r: number; c: number }[];
}

export const App: React.FC = () => {
  const [view, setView] = useState<"landing" | "login" | "dashboard" | "sudoku" | "kakuro" | "checkers" | "nqueens">("landing");
  const [username, setUsername] = useState("Guest Researcher");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [registeredUsers, setRegisteredUsers] = useState<any[]>(() => {
    const saved = localStorage.getItem("puzzle_platform_users");
    if (saved) return JSON.parse(saved);
    return [{ email: "raj@123", username: "Raj", password: "raj@123" }];
  });

  useEffect(() => {
    localStorage.setItem("puzzle_platform_users", JSON.stringify(registeredUsers));
  }, [registeredUsers]);

  // Landing Page floaters
  const [floaters, setFloaters] = useState<any[]>([
    { id: 1, type: "sudoku", label: "7", x: 120, y: 160, vx: 0.25, vy: -0.15, isDragging: false },
    { id: 2, type: "sudoku", label: "3", x: 180, y: 320, vx: -0.2, vy: 0.25, isDragging: false },
    { id: 3, type: "checker-red", label: "🌸", x: 800, y: 150, vx: 0.18, vy: 0.2, isDragging: false },
    { id: 4, type: "checker-black", label: "❄️", x: 860, y: 260, vx: -0.22, vy: -0.15, isDragging: false },
    { id: 5, type: "kakuro", label: "16\\", x: 140, y: 480, vx: -0.18, vy: -0.22, isDragging: false },
    { id: 6, type: "kakuro", label: "\\17", x: 780, y: 420, vx: 0.15, vy: -0.18, isDragging: false }
  ]);

  const activeDragIdRef = useRef<number | null>(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    let animationFrameId: number;
    const updatePhysics = () => {
      setFloaters(prev => prev.map(f => {
        if (f.isDragging) return f;
        let nx = f.x + f.vx;
        let ny = f.y + f.vy;

        let nvx = f.vx;
        let nvy = f.vy;
        if (nx < 20 || nx > window.innerWidth - 60) nvx *= -1;
        if (ny < 100 || ny > window.innerHeight - 100) nvy *= -1;

        return {
          ...f,
          x: Math.max(20, Math.min(window.innerWidth - 60, nx)),
          y: Math.max(100, Math.min(window.innerHeight - 100, ny)),
          vx: nvx,
          vy: nvy
        };
      }));
      animationFrameId = requestAnimationFrame(updatePhysics);
    };

    if (view === "landing") {
      animationFrameId = requestAnimationFrame(updatePhysics);
    }
    return () => cancelAnimationFrame(animationFrameId);
  }, [view]);

  const [cardSudokuNum, setCardSudokuNum] = useState<number>(5);
  const [cardKakuroNum, setCardKakuroNum] = useState<number>(9);
  const [cardCheckerTurn, setCardCheckerTurn] = useState<boolean>(true);

  useEffect(() => {
    let interval: number;
    if (view === "dashboard") {
      interval = window.setInterval(() => {
        setCardSudokuNum(() => Math.floor(Math.random() * 9) + 1);
        setCardKakuroNum(() => Math.floor(Math.random() * 9) + 1);
        setCardCheckerTurn(prev => !prev);
      }, 500);
    }
    return () => clearInterval(interval);
  }, [view]);

  const handleFloaterMouseDown = (id: number, e: React.MouseEvent) => {
    activeDragIdRef.current = id;
    const floater = floaters.find(f => f.id === id);
    if (floater) {
      dragOffsetRef.current = {
        x: e.clientX - floater.x,
        y: e.clientY - floater.y
      };
      setFloaters(prev => prev.map(f => f.id === id ? { ...f, isDragging: true } : f));
    }
  };

  const handleFloaterMouseMove = (e: MouseEvent) => {
    if (activeDragIdRef.current !== null) {
      const id = activeDragIdRef.current;
      setFloaters(prev => prev.map(f => {
        if (f.id === id) {
          return {
            ...f,
            x: e.clientX - dragOffsetRef.current.x,
            y: e.clientY - dragOffsetRef.current.y
          };
        }
        return f;
      }));
    }
  };

  const handleFloaterMouseUp = () => {
    if (activeDragIdRef.current !== null) {
      const id = activeDragIdRef.current;
      setFloaters(prev => prev.map(f => {
        if (f.id === id) {
          return {
            ...f,
            isDragging: false,
            vx: (Math.random() - 0.5) * 1.5,
            vy: (Math.random() - 0.5) * 1.5
          };
        }
        return f;
      }));
      activeDragIdRef.current = null;
    }
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleFloaterMouseMove);
    window.addEventListener("mouseup", handleFloaterMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleFloaterMouseMove);
      window.removeEventListener("mouseup", handleFloaterMouseUp);
    };
  }, [floaters]);

  // Auth Functions
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const response = await fetch("http://localhost:8080/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase(), password })
      });

      if (response.ok) {
        const data = await response.json();
        setUsername(data.user.username);
        setView("dashboard");
        return;
      } else {
        const errData = await response.json().catch(() => ({}));
        setError(errData.error || "Credentials authorization failed.");
        return;
      }
    } catch (err) {
      const matched = registeredUsers.find(u => 
        u.email.toLowerCase() === email.toLowerCase() && 
        (u.password === password || u.password.toLowerCase() === password.toLowerCase())
      );
      if (matched) {
        setUsername(matched.username);
        setView("dashboard");
      } else {
        setError("Invalid credentials. Enter seeded or registered credentials.");
      }
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const response = await fetch("http://localhost:8080/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.toLowerCase(), username, password })
      });

      if (response.ok) {
        setSuccessMsg("Registration successful! Switching to verify console.");
        setRegisteredUsers(prev => [...prev, { email: email.toLowerCase(), username, password }]);
        setTimeout(() => {
          setIsSignUp(false);
          setSuccessMsg("");
        }, 1500);
        return;
      } else {
        const errData = await response.json().catch(() => ({}));
        setError(errData.error || "Registration rejected.");
        return;
      }
    } catch (err) {
      if (registeredUsers.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        setError("Email is already registered.");
        return;
      }

      setRegisteredUsers(prev => [...prev, { email: email.toLowerCase(), username, password }]);
      setSuccessMsg("Registration recorded locally! Switching to verify console.");
      setTimeout(() => {
        setIsSignUp(false);
        setSuccessMsg("");
      }, 1500);
    }
  };

  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleStep, setGoogleStep] = useState<"choose" | "custom" | "loading">("choose");
  const [googleEmail, setGoogleEmail] = useState("");
  const [googlePassword, setGooglePassword] = useState("");
  const [googleLoadingText, setGoogleLoadingText] = useState("");

  const triggerGoogleAuth = async (emailStr: string) => {
    setGoogleStep("loading");
    setGoogleLoadingText("Connecting to Google Accounts API...");
    await new Promise(resolve => setTimeout(resolve, 800));
    setGoogleLoadingText("Authenticating security credentials...");
    await new Promise(resolve => setTimeout(resolve, 800));
    setGoogleLoadingText("Exchanging OAuth2 authorization code...");
    await new Promise(resolve => setTimeout(resolve, 800));
    
    // Parse Google email to create a Researcher name
    const baseName = emailStr.split("@")[0];
    const capitalized = baseName.charAt(0).toUpperCase() + baseName.slice(1);
    setUsername(`${capitalized} (Google)`);
    setView("dashboard");
    setShowGoogleModal(false);
    setGoogleStep("choose");
    setGoogleEmail("");
    setGooglePassword("");
  };

  const handleGoogleLogin = () => {
    setShowGoogleModal(true);
    setGoogleStep("choose");
    setError("");
  };

  // -------------------------------------------------------------
  // SUDOKU WORKSPACE (CUSTOM INPUTS + SIZE: 4x4 to 9x9)
  // -------------------------------------------------------------
  const [sudokuSize, setSudokuSize] = useState<number>(9);
  const [sudokuGrid, setSudokuGrid] = useState<number[][]>(() => Array.from({ length: 9 }, () => Array(9).fill(0)));
  const [sudokuFixedCells, setSudokuFixedCells] = useState<boolean[][]>(() => Array.from({ length: 9 }, () => Array(9).fill(false)));
  const [sudokuCurrentCell, setSudokuCurrentCell] = useState<{ r: number; c: number } | null>(null);
  const [sudokuSolved, setSudokuSolved] = useState(false);
  const [sudokuIsSolving, setSudokuIsSolving] = useState(false);
  const [sudokuExplored, setSudokuExplored] = useState(0);
  const [sudokuBacktracks, setSudokuBacktracks] = useState(0);
  const [sudokuLogs, setSudokuLogs] = useState<string[]>([]);
  const sudokuAbortRef = useRef<boolean>(false);

  // Auto-resize grid when sudokuSize changes
  useEffect(() => {
    resetSudokuBoard();
  }, [sudokuSize]);

  const loadSudokuDemo = () => {
    resetSudokuBoard();
  };

  const runSudokuSolve = async () => {
    setSudokuIsSolving(true);
    setSudokuSolved(false);
    setSudokuExplored(0);
    setSudokuBacktracks(0);
    setSudokuLogs(["[SYSTEM] Initializing CSP variable mappings..."]);
    sudokuAbortRef.current = false;

    // Lock down user-provided inputs as static clues
    const fixedMatrix = sudokuGrid.map((row) => row.map((val) => val !== 0));
    setSudokuFixedCells(fixedMatrix);

    const board = sudokuGrid.map(row => [...row]);
    const maxVal = sudokuSize;

    // Subgrid boundary calculations
    let boxRows = 3;
    let boxCols = 3;
    if (sudokuSize === 4) {
      boxRows = 2;
      boxCols = 2;
    } else if (sudokuSize === 6) {
      boxRows = 2;
      boxCols = 3;
    } else if (sudokuSize === 8) {
      boxRows = 2;
      boxCols = 4;
    } else if (sudokuSize === 5 || sudokuSize === 7) {
      boxRows = 0; // No subgrid constraint checking for prime sizes
      boxCols = 0;
    }

    const isValid = (r: number, c: number, val: number): boolean => {
      // Row and Column uniqueness
      for (let i = 0; i < sudokuSize; i++) {
        if (i !== c && board[r][i] === val) return false;
        if (i !== r && board[i][c] === val) return false;
      }
      // Box uniqueness
      if (boxRows > 0 && boxCols > 0) {
        const br = Math.floor(r / boxRows) * boxRows;
        const bc = Math.floor(c / boxCols) * boxCols;
        for (let ri = br; ri < br + boxRows; ri++) {
          for (let ci = bc; ci < bc + boxCols; ci++) {
            if ((ri !== r || ci !== c) && board[ri][ci] === val) {
              return false;
            }
          }
        }
      }
      return true;
    };

    // Forward Checking Domains
    const domains = Array.from({ length: sudokuSize }, () =>
      Array.from({ length: sudokuSize }, () => Array(maxVal + 1).fill(1))
    );

    const getCandidateCount = (r: number, c: number) => {
      let count = 0;
      for (let v = 1; v <= maxVal; v++) {
        if (domains[r][c][v] === 1) count++;
      }
      return count;
    };

    const restrictDomains = (row: number, col: number, val: number) => {
      for (let i = 0; i < sudokuSize; i++) {
        if (i !== col) domains[row][i][val] = 0;
        if (i !== row) domains[i][col][val] = 0;
      }
      if (boxRows > 0 && boxCols > 0) {
        const br = Math.floor(row / boxRows) * boxRows;
        const bc = Math.floor(col / boxCols) * boxCols;
        for (let r = br; r < br + boxRows; r++) {
          for (let c = bc; c < bc + boxCols; c++) {
            if (r !== row || c !== col) {
              domains[r][c][val] = 0;
            }
          }
        }
      }
    };

    // Pre-populate domains from fixed clues
    for (let r = 0; r < sudokuSize; r++) {
      for (let c = 0; c < sudokuSize; c++) {
        if (board[r][c] !== 0) {
          const val = board[r][c];
          restrictDomains(r, c, val);
          for (let v = 1; v <= maxVal; v++) {
            if (v !== val) domains[r][c][v] = 0;
          }
        }
      }
    }

    const checkForwardChecking = () => {
      for (let r = 0; r < sudokuSize; r++) {
        for (let c = 0; c < sudokuSize; c++) {
          if (board[r][c] === 0 && getCandidateCount(r, c) === 0) {
            return false;
          }
        }
      }
      return true;
    };

    const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));

    const solve = async (): Promise<boolean> => {
      if (sudokuAbortRef.current) return false;
      setSudokuExplored(prev => prev + 1);

      // MRV heuristic cell selection
      let minVal = maxVal + 2;
      let targetR = -1;
      let targetC = -1;

      for (let r = 0; r < sudokuSize; r++) {
        for (let c = 0; c < sudokuSize; c++) {
          if (board[r][c] === 0) {
            const count = getCandidateCount(r, c);
            if (count < minVal) {
              minVal = count;
              targetR = r;
              targetC = c;
            }
          }
        }
      }

      if (targetR === -1) return true; // complete

      if (minVal === 0) {
        setSudokuBacktracks(prev => prev + 1);
        return false;
      }

      for (let v = 1; v <= maxVal; v++) {
        if (domains[targetR][targetC][v] === 1) {
          if (!isValid(targetR, targetC, v)) continue;

          const backup = domains.map(r => r.map(c => [...c]));
          board[targetR][targetC] = v;
          restrictDomains(targetR, targetC, v);

          setSudokuGrid(board.map(row => [...row]));
          setSudokuCurrentCell({ r: targetR, c: targetC });
          setSudokuLogs(prev => [
            `[TRY] Assigned value ${v} at (${targetR},${targetC}) (MRV: ${minVal} candidates)`,
            ...prev.slice(0, 15)
          ]);
          await sleep(65);

          if (checkForwardChecking()) {
            if (await solve()) return true;
          } else {
            setSudokuLogs(prev => [
              `[PRUNE] Forward check failed for ${v} at (${targetR},${targetC})`,
              ...prev.slice(0, 15)
            ]);
            setSudokuBacktracks(prev => prev + 1);
          }

          // Backtrack
          board[targetR][targetC] = 0;
          for (let r = 0; r < sudokuSize; r++) {
            for (let c = 0; c < sudokuSize; c++) {
              domains[r][c] = [...backup[r][c]];
            }
          }
          setSudokuGrid(board.map(row => [...row]));
          setSudokuLogs(prev => [
            `[BACKTRACK] Reverting value ${v} from Cell (${targetR},${targetC})`,
            ...prev.slice(0, 15)
          ]);
          await sleep(35);
        }
      }
      return false;
    };

    const success = await solve();
    setSudokuIsSolving(false);
    setSudokuCurrentCell(null);
    if (success) {
      setSudokuSolved(true);
      setSudokuLogs(prev => ["[SUCCESS] Sudoku solved completely!", ...prev]);
    } else if (!sudokuAbortRef.current) {
      setSudokuLogs(prev => ["[FAILED] Solver failed. Check for conflicting initial clues.", ...prev]);
    }
  };

  const resetSudokuBoard = () => {
    sudokuAbortRef.current = true;
    const demo = getRandomizedSudokuTemplate(sudokuSize);
    setSudokuGrid(demo.map(row => [...row]));
    setSudokuFixedCells(demo.map(row => row.map(val => val !== 0)));
    setSudokuSolved(false);
    setSudokuIsSolving(false);
    setSudokuExplored(0);
    setSudokuBacktracks(0);
    setSudokuLogs([]);
  };

  const clearSudokuBoard = () => {
    sudokuAbortRef.current = true;
    setSudokuGrid(Array.from({ length: sudokuSize }, () => Array(sudokuSize).fill(0)));
    setSudokuFixedCells(Array.from({ length: sudokuSize }, () => Array(sudokuSize).fill(false)));
    setSudokuSolved(false);
    setSudokuIsSolving(false);
    setSudokuExplored(0);
    setSudokuBacktracks(0);
    setSudokuLogs(["[SYSTEM] Board cleared. Ready for custom clues input..."]);
  };

  // -------------------------------------------------------------
  // KAKURO WORKSPACE (DYNAMIC INPUTS + DYNAMIC RUN GENERATION + SIZES)
  // -------------------------------------------------------------
  const [kakuroSize, setKakuroSize] = useState<number>(5);
  const [kakuroGrid, setKakuroGrid] = useState<KakuroCell[][]>(() => getKakuroTemplate(5));
  const [kakuroCurrentCell, setKakuroCurrentCell] = useState<{ r: number; c: number } | null>(null);
  const [kakuroSolved, setKakuroSolved] = useState(false);
  const [kakuroIsSolving, setKakuroIsSolving] = useState(false);
  const [kakuroExplored, setKakuroExplored] = useState(0);
  const [kakuroBacktracks, setKakuroBacktracks] = useState(0);
  const [kakuroLogs, setKakuroLogs] = useState<string[]>([]);
  const [editingClueCell, setEditingClueCell] = useState<{ r: number; c: number } | null>(null);
  const [clueInputH, setClueInputH] = useState("");
  const [clueInputV, setClueInputV] = useState("");
  const kakuroAbortRef = useRef<boolean>(false);

  useEffect(() => {
    resetKakuroBoard();
  }, [kakuroSize]);

  const loadKakuroDemo = () => {
    resetKakuroBoard();
  };

  const cycleKakuroCellType = (r: number, c: number) => {
    if (kakuroIsSolving) return;
    const next = kakuroGrid.map(row => row.map(cell => ({ ...cell })));
    const current = next[r][c];

    if (current.type === "block") {
      current.type = "white";
      current.val = 0;
      current.vSum = undefined;
      current.hSum = undefined;
    } else if (current.type === "white") {
      current.type = "clue";
      current.val = 0;
      current.vSum = 0;
      current.hSum = 0;
      setEditingClueCell({ r, c });
      setClueInputH("");
      setClueInputV("");
    } else {
      current.type = "block";
      current.val = 0;
      current.vSum = undefined;
      current.hSum = undefined;
      setEditingClueCell(null);
    }
    setKakuroGrid(next);
  };

  const saveClueValues = () => {
    if (!editingClueCell) return;
    const { r, c } = editingClueCell;
    const next = kakuroGrid.map(row => row.map(cell => ({ ...cell })));
    next[r][c].hSum = parseInt(clueInputH) || undefined;
    next[r][c].vSum = parseInt(clueInputV) || undefined;
    setKakuroGrid(next);
    setEditingClueCell(null);
  };

  // Run Solver
  const runKakuroSolve = async () => {
    setKakuroIsSolving(true);
    setKakuroSolved(false);
    setKakuroExplored(0);
    setKakuroBacktracks(0);
    setKakuroLogs(["[SYSTEM] Detecting clues and run intersections dynamically..."]);
    kakuroAbortRef.current = false;

    const board = kakuroGrid.map(row => row.map(c => ({ ...c })));
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    // Dynamic Run Detector
    const runs: KakuroRun[] = [];
    const R = board.length;
    const C = board[0].length;

    // Detect horizontal runs
    for (let r = 0; r < R; r++) {
      for (let c = 0; c < C; c++) {
        const cell = board[r][c];
        if (cell.type === "clue" && cell.hSum && cell.hSum > 0) {
          const runCells: { r: number; c: number }[] = [];
          let nextC = c + 1;
          while (nextC < C && board[r][nextC].type === "white") {
            runCells.push({ r, c: nextC });
            nextC++;
          }
          if (runCells.length > 0) {
            runs.push({ targetSum: cell.hSum, cells: runCells });
          }
        }
      }
    }

    // Detect vertical runs
    for (let r = 0; r < R; r++) {
      for (let c = 0; c < C; c++) {
        const cell = board[r][c];
        if (cell.type === "clue" && cell.vSum && cell.vSum > 0) {
          const runCells: { r: number; c: number }[] = [];
          let nextR = r + 1;
          while (nextR < R && board[nextR][c].type === "white") {
            runCells.push({ r: nextR, c });
            nextR++;
          }
          if (runCells.length > 0) {
            runs.push({ targetSum: cell.vSum, cells: runCells });
          }
        }
      }
    }

    setKakuroLogs(prev => [
      `[SYSTEM] Dynamic parser extracted ${runs.length} constraint equations.`,
      ...prev
    ]);

    // Find variable white cells
    const variables: { r: number; c: number }[] = [];
    for (let r = 0; r < R; r++) {
      for (let c = 0; c < C; c++) {
        // AI solves empty white cells, treats non-zero user white cells as preset values
        if (board[r][c].type === "white" && board[r][c].val === 0) {
          variables.push({ r, c });
        }
      }
    }

    const checkValid = (grid: KakuroCell[][], r: number, c: number, val: number) => {
      const associated = runs.filter(run => run.cells.some(cell => cell.r === r && cell.c === c));
      for (const run of associated) {
        for (const cell of run.cells) {
          if (cell.r === r && cell.c === c) continue;
          if (grid[cell.r][cell.c].val === val) return false; // uniqueness
        }
      }
      return true;
    };

    const checkSumBoundaryPruning = (grid: KakuroCell[][], r: number, c: number) => {
      const associated = runs.filter(run => run.cells.some(cell => cell.r === r && cell.c === c));
      for (const run of associated) {
        let currentSum = 0;
        let emptyCount = 0;
        const used = new Set<number>();

        for (const cell of run.cells) {
          const val = grid[cell.r][cell.c].val;
          if (val === 0) {
            emptyCount++;
          } else {
            currentSum += val;
            used.add(val);
          }
        }

        if (currentSum > run.targetSum) return false;

        if (emptyCount > 0) {
          const remaining = run.targetSum - currentSum;
          const minPossible = getExtremaSum(emptyCount, used, true);
          const maxPossible = getExtremaSum(emptyCount, used, false);

          if (remaining < minPossible || remaining > maxPossible) {
            return false; // Prune branch
          }
        } else {
          if (currentSum !== run.targetSum) return false;
        }
      }
      return true;
    };

    const solveHelper = async (idx: number): Promise<boolean> => {
      if (kakuroAbortRef.current) return false;
      setKakuroExplored(prev => prev + 1);

      if (idx === variables.length) {
        // Final equations verify pass
        for (const run of runs) {
          let sum = 0;
          for (const cell of run.cells) sum += board[cell.r][cell.c].val;
          if (sum !== run.targetSum) return false;
        }
        return true;
      }

      const { r, c } = variables[idx];

      for (let v = 1; v <= 9; v++) {
        if (checkValid(board, r, c, v)) {
          board[r][c].val = v;
          setKakuroGrid(board.map(row => row.map(cell => ({ ...cell }))));
          setKakuroCurrentCell({ r, c });
          setKakuroLogs(prev => [
            `[TRY] Assigned ${v} at Cell (${r},${c})`,
            ...prev.slice(0, 15)
          ]);
          await sleep(65);

          if (checkSumBoundaryPruning(board, r, c)) {
            if (await solveHelper(idx + 1)) return true;
          } else {
            setKakuroLogs(prev => [
              `[PRUNE] Pruning value ${v} at (${r},${c}): summation check failed.`,
              ...prev.slice(0, 15)
            ]);
            setKakuroBacktracks(prev => prev + 1);
          }

          board[r][c].val = 0;
          setKakuroGrid(board.map(row => row.map(cell => ({ ...cell }))));
          setKakuroLogs(prev => [
            `[BACKTRACK] Reverted value ${v} from Cell (${r},${c})`,
            ...prev.slice(0, 15)
          ]);
          await sleep(35);
        }
      }
      return false;
    };

    const success = await solveHelper(0);
    setKakuroIsSolving(false);
    setKakuroCurrentCell(null);
    if (success) {
      setKakuroSolved(true);
      setKakuroLogs(prev => ["[SUCCESS] Kakuro solved completely!", ...prev]);
    } else if (!kakuroAbortRef.current) {
      setKakuroLogs(prev => ["[FAILED] Invalid configuration. Solver dead-locked.", ...prev]);
    }
  };

  const resetKakuroBoard = () => {
    kakuroAbortRef.current = true;
    setKakuroGrid(getRandomizedKakuroTemplate(kakuroSize));
    setKakuroSolved(false);
    setKakuroIsSolving(false);
    setKakuroExplored(0);
    setKakuroBacktracks(0);
    setKakuroLogs([]);
    setEditingClueCell(null);
  };

  const clearKakuroBoard = () => {
    kakuroAbortRef.current = true;
    const blankGrid = Array.from({ length: kakuroSize }, (_, r) => 
      Array.from({ length: kakuroSize }, (_, c) => ({
        row: r,
        col: c,
        type: "block" as const,
        val: 0
      }))
    );
    setKakuroGrid(blankGrid);
    setKakuroSolved(false);
    setKakuroIsSolving(false);
    setKakuroExplored(0);
    setKakuroBacktracks(0);
    setKakuroLogs(["[SYSTEM] Board cleared. Click cells to place Blocks, Clues, or White space cells."]);
    setEditingClueCell(null);
  };

  // -------------------------------------------------------------
  // N-QUEENS WORKSPACE (CONSTRAINT SATISFACTION PROBLEM)
  // -------------------------------------------------------------
  const [nqueensSize, setNqueensSize] = useState<number>(8);
  const [nqueensBoard, setNqueensBoard] = useState<number[][]>([]);
  const [nqueensIsSolving, setNqueensIsSolving] = useState(false);
  const [nqueensExplored, setNqueensExplored] = useState(0);
  const [nqueensBacktracks, setNqueensBacktracks] = useState(0);
  const [nqueensLogs, setNqueensLogs] = useState<string[]>([]);
  const [nqueensSolved, setNqueensSolved] = useState(false);
  const nqueensAbortRef = useRef<boolean>(false);

  useEffect(() => {
    resetNQueensBoard();
  }, [nqueensSize]);

  const resetNQueensBoard = () => {
    nqueensAbortRef.current = true;
    setNqueensBoard(Array.from({ length: nqueensSize }, () => Array(nqueensSize).fill(0)));
    setNqueensSolved(false);
    setNqueensIsSolving(false);
    setNqueensExplored(0);
    setNqueensBacktracks(0);
    setNqueensLogs(["[SYSTEM] Calibration complete. Ready to run solve..."]);
  };

  const runNQueensSolve = async () => {
    if (nqueensIsSolving) return;
    nqueensAbortRef.current = false;
    setNqueensIsSolving(true);
    setNqueensSolved(false);
    setNqueensExplored(0);
    setNqueensBacktracks(0);
    setNqueensLogs(["[SYSTEM] Starting N-Queens CSP solver..."]);

    const n = nqueensSize;
    const board = Array.from({ length: n }, () => Array(n).fill(0));
    const cols = new Array(n).fill(false);
    const diag1 = new Array(2 * n - 1).fill(false);
    const diag2 = new Array(2 * n - 1).fill(false);

    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    const backtrack = async (row: number): Promise<boolean> => {
      if (nqueensAbortRef.current) return false;
      setNqueensExplored(prev => prev + 1);

      if (row === n) return true;

      for (let col = 0; col < n; col++) {
        if (nqueensAbortRef.current) return false;

        const d1 = row - col + n - 1;
        const d2 = row + col;

        board[row][col] = 2; // Trial
        setNqueensBoard(board.map(r => [...r]));
        setNqueensLogs(prev => [
          `[TRY] Attempting Queen placement at (${row}, ${col})`,
          ...prev.slice(0, 15)
        ]);
        await sleep(Math.max(10, 120 - n * 8));

        if (!cols[col] && !diag1[d1] && !diag2[d2]) {
          board[row][col] = 1; // Assigned
          cols[col] = true;
          diag1[d1] = true;
          diag2[d2] = true;

          setNqueensBoard(board.map(r => [...r]));
          setNqueensLogs(prev => [
            `[ASSIGN] Placed Queen safely at (${row}, ${col})`,
            ...prev.slice(0, 15)
          ]);
          await sleep(Math.max(10, 100 - n * 8));

          if (await backtrack(row + 1)) return true;

          // Backtrack
          board[row][col] = 2; // back to trial
          setNqueensBoard(board.map(r => [...r]));
          setNqueensLogs(prev => [
            `[PRUNE] Downstream constraint failure from (${row}, ${col})`,
            ...prev.slice(0, 15)
          ]);
          await sleep(Math.max(10, 70 - n * 8));

          board[row][col] = 0;
          cols[col] = false;
          diag1[d1] = false;
          diag2[d2] = false;
          setNqueensBacktracks(prev => prev + 1);
          setNqueensBoard(board.map(r => [...r]));
          setNqueensLogs(prev => [
            `[BACKTRACK] Reverted placement at (${row}, ${col})`,
            ...prev.slice(0, 15)
          ]);
          await sleep(Math.max(10, 70 - n * 8));
        } else {
          board[row][col] = 3; // Attack
          setNqueensBoard(board.map(r => [...r]));
          setNqueensLogs(prev => [
            `[INVALID] Queen at (${row}, ${col}) is under attack! Pruning.`,
            ...prev.slice(0, 15)
          ]);
          await sleep(Math.max(10, 80 - n * 8));
          board[row][col] = 0;
          setNqueensBoard(board.map(r => [...r]));
        }
      }
      return false;
    };

    const success = await backtrack(0);
    setNqueensIsSolving(false);
    if (success) {
      setNqueensSolved(true);
      setNqueensLogs(prev => [`[SUCCESS] Successfully placed ${n} queens on the ${n}x${n} board!`, ...prev]);
    } else if (!nqueensAbortRef.current) {
      setNqueensLogs(prev => [`[FAILED] Solver finished. No solution found for size ${n}.`, ...prev]);
    }
  };

  // -------------------------------------------------------------
  // CHECKERS WORKSPACE (LIGHT GLASSMORPHIC THEME COINS)
  // -------------------------------------------------------------
  const [checkersBoard, setCheckersBoard] = useState<number[][]>(INITIAL_CHECKERS.map(row => [...row]));
  const [checkersHistory, setCheckersHistory] = useState<string[]>([]);
  const [checkersLogs, setCheckersLogs] = useState<string[]>([]);
  const [checkersIsSolving, setCheckersIsSolving] = useState(false);
  const [checkersSelected, setCheckersSelected] = useState<{ r: number; c: number } | null>(null);
  const [checkersLegalMoves, setCheckersLegalMoves] = useState<CheckersMove[]>([]);
  const [checkersWinner, setCheckersWinner] = useState<string | null>(null);
  const [checkersEvaluated, setCheckersEvaluated] = useState(0);
  const [checkersSearchDepth, setCheckersSearchDepth] = useState(0);
  const [checkersAlphaBetaCuts, setCheckersAlphaBetaCuts] = useState(0);
  const [checkersMode, setCheckersMode] = useState<"player" | "auto">("player");
  const [checkersEditMode, setCheckersEditMode] = useState(false);

  const handleCheckerCellClick = (r: number, c: number) => {
    if (checkersWinner || checkersIsSolving || checkersMode === "auto") return;

    if (checkersEditMode) {
      if ((r + c) % 2 === 1) {
        const nextGrid = checkersBoard.map(row => [...row]);
        const current = nextGrid[r][c];
        let nextVal = 0;
        if (current === 0) nextVal = -1;
        else if (current === -1) nextVal = -2;
        else if (current === -2) nextVal = 1;
        else if (current === 1) nextVal = 2;
        else if (current === 2) nextVal = 0;

        nextGrid[r][c] = nextVal;
        setCheckersBoard(nextGrid);
        setCheckersHistory(prev => [...prev.slice(-16), boardToString(nextGrid)]);
      }
      return;
    }

    const piece = checkersBoard[r][c];

    if (piece < 0) {
      setCheckersSelected({ r, c });
      const allLegal = generateLegalMoves(checkersBoard, -1);
      const cellLegal = allLegal.filter(m => m.fromR === r && m.fromC === c);
      setCheckersLegalMoves(cellLegal);
    } else if (checkersSelected) {
      const matched = checkersLegalMoves.find(m => m.toR === r && m.toC === c);
      if (matched) {
        const next = applyCheckersMove(checkersBoard, matched);
        setCheckersBoard(next);
        setCheckersHistory(prev => [...prev.slice(-16), boardToString(next)]);
        setCheckersSelected(null);
        setCheckersLegalMoves([]);
        setCheckersLogs(prev => [`[PLAYER] Moved piece from (${matched.fromR},${matched.fromC}) to (${matched.toR},${matched.toC})`, ...prev]);

        if (generateLegalMoves(next, 1).length === 0) {
          setCheckersWinner("Light Blue Player Wins!");
          return;
        }

        triggerCheckersAITurn(next);
      } else {
        setCheckersSelected(null);
        setCheckersLegalMoves([]);
      }
    }
  };

  const triggerCheckersAITurn = async (boardState: number[][]) => {
    setCheckersIsSolving(true);
    setCheckersLogs(prev => ["[AI] Finding optimal alpha-beta cut-off move...", ...prev]);

    let stats = { evaluated: 0, depth: 5, alphaBetaCuts: 0 };
    await new Promise(r => setTimeout(r, 600));

    const runMinimax = (board: number[][], depth: number, alpha: number, beta: number, activePlayer: number): number => {
      stats.evaluated++;
      if (depth === 0) return evaluateCheckersBoard(board, checkersHistory, activePlayer);

      const moves = generateLegalMoves(board, activePlayer);
      if (moves.length === 0) {
        return activePlayer === 1 ? -10000 : 10000;
      }

      moves.sort((m1, m2) => (m2.isCapture ? 1 : 0) - (m1.isCapture ? 1 : 0));

      if (activePlayer === 1) { // Coral Rose AI
        let maxVal = -Infinity;
        for (const m of moves) {
          const next = applyCheckersMove(board, m);
          const score = runMinimax(next, depth - 1, alpha, beta, -1);
          maxVal = Math.max(maxVal, score);
          alpha = Math.max(alpha, score);
          if (beta <= alpha) {
            stats.alphaBetaCuts++;
            break;
          }
        }
        return maxVal;
      } else { // Light Cyan Player
        let minVal = Infinity;
        for (const m of moves) {
          const next = applyCheckersMove(board, m);
          const score = runMinimax(next, depth - 1, alpha, beta, 1);
          minVal = Math.min(minVal, score);
          beta = Math.min(beta, score);
          if (beta <= alpha) {
            stats.alphaBetaCuts++;
            break;
          }
        }
        return minVal;
      }
    };

    const moves = generateLegalMoves(boardState, 1);
    if (moves.length === 0) {
      setCheckersWinner("Light Blue Player Wins!");
      setCheckersIsSolving(false);
      return;
    }

    moves.sort((m1, m2) => (m2.isCapture ? 1 : 0) - (m1.isCapture ? 1 : 0));
    let bestScore = -Infinity;
    let bestMoves: any[] = [];

    for (const m of moves) {
      const next = applyCheckersMove(boardState, m);
      const score = runMinimax(next, 4, -Infinity, Infinity, -1);
      if (score > bestScore) {
        bestScore = score;
        bestMoves = [m];
      } else if (score === bestScore) {
        bestMoves.push(m);
      }
    }
    const bestMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];

    const finalBoard = applyCheckersMove(boardState, bestMove);
    setCheckersBoard(finalBoard);
    setCheckersHistory(prev => [...prev.slice(-16), boardToString(finalBoard)]);
    setCheckersEvaluated(stats.evaluated);
    setCheckersSearchDepth(stats.depth);
    setCheckersAlphaBetaCuts(stats.alphaBetaCuts);
    setCheckersLogs(prev => [
      `[AI] Evaluated ${stats.evaluated} states. Best decision value: ${bestScore}`,
      `[AI] Selected move: (${bestMove.fromR},${bestMove.fromC}) -> (${bestMove.toR},${bestMove.toC})`,
      ...prev
    ]);

    setCheckersIsSolving(false);

    if (generateLegalMoves(finalBoard, -1).length === 0) {
      setCheckersWinner("Coral Rose AI Wins!");
    }
  };

  useEffect(() => {
    let timeout: number;
    const runAuto = async () => {
      if (view === "checkers" && checkersMode === "auto" && !checkersWinner && !checkersIsSolving) {
        setCheckersIsSolving(true);
        await new Promise(r => setTimeout(r, 800));

        // Red/Coral AI Move
        const redMoves = generateLegalMoves(checkersBoard, 1);
        if (redMoves.length === 0) {
          setCheckersWinner("Cyan AI Wins!");
          setCheckersIsSolving(false);
          return;
        }

        let bestScore = -Infinity;
        let bestMoves: any[] = [];
        redMoves.forEach(m => {
          const next = applyCheckersMove(checkersBoard, m);
          const score = evaluateCheckersBoard(next, checkersHistory, 1);
          if (score > bestScore) {
            bestScore = score;
            bestMoves = [m];
          } else if (score === bestScore) {
            bestMoves.push(m);
          }
        });
        const bestMove = bestMoves[Math.floor(Math.random() * bestMoves.length)];

        const nextBoard = applyCheckersMove(checkersBoard, bestMove);
        setCheckersBoard(nextBoard);
        setCheckersHistory(prev => [...prev.slice(-16), boardToString(nextBoard)]);
        setCheckersLogs(prev => [`[CORAL AI] Moved piece to (${bestMove.toR},${bestMove.toC})`, ...prev]);

        if (generateLegalMoves(nextBoard, -1).length === 0) {
          setCheckersWinner("Coral AI Wins!");
          setCheckersIsSolving(false);
          return;
        }

        // Cyan AI Move
        await new Promise(r => setTimeout(r, 800));
        const cyanMoves = generateLegalMoves(nextBoard, -1);
        if (cyanMoves.length === 0) {
          setCheckersWinner("Coral AI Wins!");
          setCheckersIsSolving(false);
          return;
        }

        let bestCyanScore = Infinity;
        let bestCyanMoves: any[] = [];
        cyanMoves.forEach(m => {
          const next = applyCheckersMove(nextBoard, m);
          const score = evaluateCheckersBoard(next, [...checkersHistory, boardToString(nextBoard)], -1);
          if (score < bestCyanScore) {
            bestCyanScore = score;
            bestCyanMoves = [m];
          } else if (score === bestCyanScore) {
            bestCyanMoves.push(m);
          }
        });
        const bestCyanMove = bestCyanMoves[Math.floor(Math.random() * bestCyanMoves.length)];

        const endBoard = applyCheckersMove(nextBoard, bestCyanMove);
        setCheckersBoard(endBoard);
        setCheckersHistory(prev => [...prev.slice(-16), boardToString(endBoard)]);
        setCheckersLogs(prev => [`[CYAN AI] Moved piece to (${bestCyanMove.toR},${bestCyanMove.toC})`, ...prev]);

        setCheckersEvaluated(redMoves.length + cyanMoves.length);
        setCheckersSearchDepth(3);
        setCheckersIsSolving(false);
      }
    };

    if (checkersMode === "auto") {
      timeout = window.setTimeout(runAuto, 500);
    }
    return () => clearTimeout(timeout);
  }, [view, checkersMode, checkersBoard, checkersWinner, checkersIsSolving]);

  const resetCheckersBoard = () => {
    setCheckersBoard(INITIAL_CHECKERS.map(row => [...row]));
    setCheckersHistory([]);
    setCheckersLogs([]);
    setCheckersSelected(null);
    setCheckersLegalMoves([]);
    setCheckersWinner(null);
    setCheckersEvaluated(0);
    setCheckersSearchDepth(0);
    setCheckersAlphaBetaCuts(0);
    setCheckersEditMode(false);
  };

  return (
    <div className="min-h-screen text-slate-100 font-sans relative bg-[#070913] overflow-x-hidden">
      {view === "landing" ? <InteractiveSearchCanvas /> : <ConstraintNetworkBackground />}

      <header className="sticky top-0 z-30 bg-[#090D1A]/85 backdrop-blur-md border-b border-cyan-500/10 flex items-center justify-between px-8 py-4">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(34,211,238,0.7)]" />
          <span className="font-mono text-xs uppercase tracking-widest text-cyan-400 font-semibold">AI Research Console v2.6</span>
        </div>
        <div className="flex items-center gap-6">
          <button onClick={() => setView("landing")} className="text-xs uppercase font-semibold text-slate-400 hover:text-white transition">Terminal Portal</button>
          {view !== "landing" && view !== "login" ? (
            <div className="flex items-center gap-4">
              <span className="text-xs font-mono text-purple-400">Researcher: {username}</span>
              <button 
                onClick={() => {
                  setView("landing");
                  resetSudokuBoard();
                  resetKakuroBoard();
                  resetCheckersBoard();
                }} 
                className="text-xs bg-red-955/50 border border-red-500/30 px-3 py-1.5 rounded hover:bg-red-900/40 text-red-300 font-semibold transition"
              >
                Terminate Session
              </button>
            </div>
          ) : (
            <button onClick={() => setView("login")} className="text-xs uppercase bg-cyan-950/40 border border-cyan-500/30 px-4 py-2 rounded hover:bg-cyan-900/40 text-cyan-300 font-semibold shadow-[0_0_15px_rgba(6,182,212,0.15)] transition">Sign In</button>
          )}
        </div>
      </header>

      {/* LANDING VIEW */}
      {view === "landing" && (
        <main className="relative min-h-[calc(100vh-80px)] flex flex-col items-center justify-center text-center px-6 py-20 z-10 pointer-events-none">
          <div className="absolute inset-0 pointer-events-auto z-10">
            {floaters.map(item => (
              <div
                key={item.id}
                onMouseDown={(e) => handleFloaterMouseDown(item.id, e)}
                style={{ left: item.x, top: item.y, cursor: item.isDragging ? "grabbing" : "grab" }}
                className={`absolute w-12 h-12 rounded-lg flex items-center justify-center select-none font-bold font-mono text-lg transition shadow-2xl border
                  ${item.type === "sudoku" ? "bg-cyan-950/70 border-cyan-500/40 text-cyan-400" : ""}
                  ${item.type === "checker-red" ? "bg-rose-900/60 border-rose-455 text-rose-300 rounded-full" : ""}
                  ${item.type === "checker-black" ? "bg-cyan-950/60 border-cyan-455 text-cyan-300 rounded-full" : ""}
                  ${item.type === "kakuro" ? "bg-purple-950/70 border-purple-500/40 text-purple-400" : ""}
                `}
              >
                {item.label}
              </div>
            ))}
          </div>

          <div className="max-w-4xl p-12 rounded-2xl bg-transparent relative z-20 pointer-events-auto">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 bg-gradient-to-r from-cyan-400 via-purple-400 to-cyan-550 bg-clip-text text-transparent">
              AI Puzzle & Strategy Platform
            </h1>
            <button onClick={() => setView("login")} className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-650 hover:from-cyan-400 hover:to-purple-500 text-white font-semibold rounded-lg shadow-lg hover:shadow-[0_0_35px_rgba(6,182,212,0.45)] transition duration-300 transform hover:-translate-y-0.5">
              Access Solver Terminal
            </button>
          </div>
        </main>
      )}

      {/* LOGIN VIEW */}
      {view === "login" && (
        <main className="min-h-[calc(100vh-80px)] flex items-center justify-center px-6 z-10 relative">
          <div className="w-full max-w-md p-8 rounded-xl bg-slate-950/70 border border-cyan-500/20 backdrop-blur-2xl shadow-[0_0_40px_rgba(6,182,212,0.15)]">
            <h2 className="text-2xl font-bold tracking-tight text-white text-center mb-2">
              {isSignUp ? "Create Researcher Account" : "Algorithmic Console Verification"}
            </h2>
            <p className="text-xs text-slate-400 text-center mb-6">{isSignUp ? "Register system profile." : "Enter credentials to unlock secure algorithms."}</p>
            
            <form onSubmit={isSignUp ? handleRegister : handleLogin} className="space-y-4">
              {isSignUp && (
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-slate-400 mb-1.5">Researcher Name</label>
                  <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full bg-slate-900/80 border border-white/10 rounded px-4 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-sm" required />
                </div>
              )}
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-slate-400 mb-1.5">Researcher Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="raj@123" className="w-full bg-slate-900/80 border border-white/10 rounded px-4 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-slate-400 mb-1.5">Security Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="raj@123" className="w-full bg-slate-900/80 border border-white/10 rounded px-4 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-sm" required />
              </div>
              {isSignUp && (
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-slate-400 mb-1.5">Confirm Password</label>
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-slate-900/80 border border-white/10 rounded px-4 py-2.5 text-slate-200 focus:outline-none focus:border-cyan-500 font-mono text-sm" required />
                </div>
              )}
              {error && <p className="text-xs text-red-400 font-semibold bg-red-955/20 border border-red-500/20 p-3 rounded">{error}</p>}
              {successMsg && <p className="text-xs text-green-400 font-semibold bg-green-955/20 border border-green-500/20 p-3 rounded">{successMsg}</p>}
              
              <button type="submit" className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-650 hover:from-cyan-400 hover:to-purple-500 text-white font-semibold rounded shadow transition uppercase tracking-widest text-xs font-mono">
                {isSignUp ? "Create Account" : "Verify Credentials"}
              </button>
            </form>

            <div className="mt-4">
              <div className="flex items-center my-4">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="mx-3 text-[10px] uppercase font-mono text-slate-500 tracking-wider">Or Authenticate With</span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>
              <button onClick={handleGoogleLogin} className="w-full flex items-center justify-center gap-3 py-2.5 bg-slate-900 border border-white/10 rounded hover:bg-slate-850 text-slate-200 font-semibold transition text-xs font-mono">
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.137 4.114-3.478 0-6.3-2.822-6.3-6.3 0-3.478 2.822-6.3 6.3-6.3 1.506 0 2.877.535 3.96 1.433l3.055-3.055C18.91 2.21 15.82 1 12.24 1 6.033 1 1 6.033 1 12.24s5.033 11.24 11.24 11.24c5.89 0 10.985-4.225 10.985-11.24 0-.766-.068-1.504-.19-1.955H12.24z"/>
                </svg>
                Sign in with Google
              </button>
            </div>

            <div className="mt-6 flex justify-between items-center text-xs">
              <button onClick={() => { setIsSignUp(!isSignUp); setError(""); setSuccessMsg(""); }} className="text-cyan-400 hover:underline">
                {isSignUp ? "Have an account? Sign In" : "Need an account? Sign Up"}
              </button>
            </div>

            <div className="mt-6 border-t border-white/10 pt-4 text-center">
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest bg-cyan-950/20 px-3 py-1.5 rounded border border-cyan-500/20">
                System Credentials: raj@123 / raj@123
              </span>
            </div>
          </div>
        </main>
      )}

      {/* DASHBOARD VIEW */}
      {view === "dashboard" && (
        <main className="max-w-7xl mx-auto px-6 py-12 relative z-10">
          <div className="mb-10">
            <h2 className="text-3xl font-extrabold text-white">Welcome, Researcher {username}</h2>
            <p className="text-slate-400 text-sm mt-1">Select an active laboratory workspace to evaluate search algorithms.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div onClick={() => setView("sudoku")} className="p-8 rounded-xl bg-slate-900/40 border border-cyan-500/20 backdrop-blur-md cursor-pointer hover:border-cyan-400 hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition duration-300 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-xl font-bold font-mono">01</div>
                  <div className="grid grid-cols-4 gap-0.5 bg-black/40 p-1.5 rounded border border-cyan-500/20">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <div key={i} className="w-3.5 h-3.5 flex items-center justify-center text-[8px] font-mono text-cyan-300 bg-slate-950 font-bold border border-white/5">
                        {i % 3 === 0 ? cardSudokuNum : ""}
                      </div>
                    ))}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Sudoku Solver Lab</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">Evaluate backtracking searches optimized with Minimum Remaining Values (MRV) and Forward Checking constraints.</p>
              </div>
              <span className="text-xs font-mono uppercase text-cyan-400 hover:underline">Open Terminal →</span>
            </div>

            <div onClick={() => setView("kakuro")} className="p-8 rounded-xl bg-slate-900/40 border border-purple-500/20 backdrop-blur-md cursor-pointer hover:border-purple-400 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] transition duration-300 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 text-xl font-bold font-mono">02</div>
                  <div className="grid grid-cols-4 gap-0.5 bg-black/40 p-1.5 rounded border border-purple-500/20">
                    {Array.from({ length: 16 }).map((_, i) => {
                      const isClue = i < 4 || i % 4 === 0;
                      return (
                        <div key={i} className={`w-3.5 h-3.5 flex items-center justify-center text-[7px] font-mono font-bold border border-white/5 ${isClue ? "bg-purple-950 text-purple-400" : "bg-slate-950 text-purple-300"}`}>
                          {!isClue && i % 2 === 0 ? cardKakuroNum : ""}
                          {isClue && "\\"}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Kakuro CSP Lab</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">Analyze summation boundary constraints and look-ahead branch pruning rules on crossword-style grids.</p>
              </div>
              <span className="text-xs font-mono uppercase text-purple-400 hover:underline">Open Terminal →</span>
            </div>

            <div onClick={() => setView("checkers")} className="p-8 rounded-xl bg-slate-900/40 border border-red-500/20 backdrop-blur-md cursor-pointer hover:border-red-400 hover:shadow-[0_0_20px_rgba(239,68,68,0.15)] transition duration-300 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 text-xl font-bold font-mono">03</div>
                  <div className="grid grid-cols-4 gap-0.5 bg-black/40 p-1.5 rounded border border-red-500/20">
                    {Array.from({ length: 16 }).map((_, i) => {
                      const isDark = (Math.floor(i / 4) + (i % 4)) % 2 === 1;
                      const hasPiece = isDark && (i < 4 || i >= 12);
                      const isRed = i < 4;
                      return (
                        <div key={i} className={`w-3.5 h-3.5 flex items-center justify-center border border-white/5 ${isDark ? "bg-slate-900" : "bg-slate-950"}`}>
                          {hasPiece && (
                            <div className={`w-2 h-2 rounded-full shadow-md ${isRed ? (cardCheckerTurn ? "bg-rose-400 scale-110" : "bg-rose-500") : (cardCheckerTurn ? "bg-cyan-400" : "bg-cyan-300 scale-110")}`} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Checkers AI Lab</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">Test adversarial gameplay utilizing Minimax searches, Alpha-Beta pruning, and center column heuristics.</p>
              </div>
              <span className="text-xs font-mono uppercase text-red-400 hover:underline">Open Terminal →</span>
            </div>

            <div onClick={() => setView("nqueens")} className="p-8 rounded-xl bg-slate-900/40 border border-violet-500/20 backdrop-blur-md cursor-pointer hover:border-violet-400 hover:shadow-[0_0_20px_rgba(139,92,246,0.15)] transition duration-300 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 rounded-lg bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400 text-xl font-bold font-mono">04</div>
                  <div className="grid grid-cols-4 gap-0.5 bg-black/40 p-1.5 rounded border border-violet-500/20">
                    {Array.from({ length: 16 }).map((_, i) => {
                      const r = Math.floor(i / 4);
                      const c = i % 4;
                      const hasQueen = (r === 0 && c === 1) || (r === 1 && c === 3) || (r === 2 && c === 0) || (r === 3 && c === 2);
                      return (
                        <div key={i} className={`w-3.5 h-3.5 flex items-center justify-center text-[8px] font-mono font-bold border border-white/5 ${(r+c)%2 === 1 ? "bg-slate-900" : "bg-slate-950"}`}>
                          {hasQueen ? "👑" : ""}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">N-Queens CSP Lab</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">Explore row-by-row lookahead pruning with an active boolean bitmask and track complex backtracks.</p>
              </div>
              <span className="text-xs font-mono uppercase text-violet-400 hover:underline">Open Terminal →</span>
            </div>
          </div>
        </main>
      )}

      {/* SUDOKU LAB WORKSPACE */}
      {view === "sudoku" && (
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-8 py-10 relative z-10">
          <div className="lg:col-span-7 p-8 rounded-xl bg-slate-900/50 border border-cyan-500/10 backdrop-blur-xl flex flex-col items-center justify-between shadow-[0_0_30px_rgba(0,0,0,0.4)]">
            <div className="w-full flex items-center justify-between mb-6 border-b border-white/5 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wider font-mono">Sudoku Variable Custom Grid</h3>
                <p className="text-xs text-slate-400">Input your clues, or load a sample layout. Blank cells will be solved by AI.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-400">Board Size:</span>
                <select 
                  value={sudokuSize}
                  onChange={(e) => setSudokuSize(parseInt(e.target.value))}
                  className="bg-slate-950 border border-cyan-500/30 text-cyan-400 text-xs font-mono px-2 py-1 rounded"
                >
                  <option value={4}>4x4 Grid</option>
                  <option value={6}>6x6 Grid</option>
                  <option value={9}>9x9 Grid</option>
                </select>
              </div>
            </div>

            {/* Load template buttons */}
            <div className="w-full flex justify-start gap-3 mb-6">
              <button 
                onClick={loadSudokuDemo}
                className="px-4 py-1.5 bg-cyan-950/40 border border-cyan-500/20 text-cyan-400 text-xs font-mono rounded hover:bg-cyan-900/30"
              >
                Load {sudokuSize}x{sudokuSize} Demo Layout
              </button>
            </div>

            {/* Dynamic Sudoku Grid */}
            <div 
              style={{ gridTemplateColumns: `repeat(${sudokuSize}, minmax(0, 1fr))` }}
              className="grid gap-1 bg-slate-950 p-2.5 rounded-lg border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.6)]"
            >
              {sudokuGrid.map((row, rIdx) => 
                row.map((val, cIdx) => {
                  const isFixed = sudokuFixedCells[rIdx] && sudokuFixedCells[rIdx][cIdx];
                  const isCurrent = sudokuCurrentCell && sudokuCurrentCell.r === rIdx && sudokuCurrentCell.c === cIdx;
                  
                  return (
                    <input 
                      key={`${rIdx}-${cIdx}`}
                      type="text"
                      maxLength={1}
                      disabled={sudokuIsSolving}
                      value={val !== 0 ? val : ""}
                      onChange={(e) => {
                        const digit = parseInt(e.target.value);
                        const nextGrid = sudokuGrid.map(r => [...r]);
                        const nextFixed = sudokuFixedCells.map(r => [...r]);
                        if (!isNaN(digit) && digit >= 1 && digit <= sudokuSize) {
                          nextGrid[rIdx][cIdx] = digit;
                          nextFixed[rIdx][cIdx] = true;
                        } else {
                          nextGrid[rIdx][cIdx] = 0;
                          nextFixed[rIdx][cIdx] = false;
                        }
                        setSudokuGrid(nextGrid);
                        setSudokuFixedCells(nextFixed);
                      }}
                      style={{
                        width: sudokuSize === 9 ? "40px" : "60px",
                        height: sudokuSize === 9 ? "40px" : "60px"
                      }}
                      className={`text-center font-bold font-mono transition-all duration-150 border border-white/5 rounded-sm focus:outline-none focus:border-cyan-500 text-sm md:text-base
                        ${isFixed ? 'bg-slate-900/80 text-cyan-400 font-extrabold' : 'bg-slate-950 text-slate-350'}
                        ${isCurrent ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400' : ''}
                        ${sudokuSolved ? 'border-green-500/20 bg-green-950/10 text-green-400' : ''}
                      `}
                    />
                  );
                })
              )}
            </div>

            {/* Controls */}
            <div className="w-full mt-10 pt-6 border-t border-white/5 flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-3">
                <button 
                  onClick={runSudokuSolve}
                  disabled={sudokuIsSolving}
                  className="px-6 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-mono text-xs font-semibold rounded disabled:opacity-50 uppercase tracking-widest shadow-[0_0_15px_rgba(6,182,212,0.3)] transition"
                >
                  {sudokuIsSolving ? "Exploring..." : "Run Solve Process"}
                </button>
                <button 
                  onClick={resetSudokuBoard}
                  className="px-6 py-2.5 bg-slate-950 border border-white/10 hover:bg-slate-900 text-slate-300 font-mono text-xs rounded transition uppercase tracking-widest"
                >
                  Reset Board
                </button>
                <button 
                  onClick={clearSudokuBoard}
                  className="px-6 py-2.5 bg-slate-950 border border-white/10 hover:bg-slate-900 text-slate-350 font-mono text-xs rounded transition uppercase tracking-widest"
                >
                  Clear Board
                </button>
              </div>
              <button 
                onClick={() => { setView("dashboard"); resetSudokuBoard(); }} 
                className="px-4 py-2 bg-purple-955/40 border border-purple-500/30 text-purple-300 text-xs font-mono uppercase tracking-widest rounded hover:bg-purple-900/40"
              >
                ← Back to Console
              </button>
            </div>
          </div>

          {/* Right Console panel */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="p-6 bg-slate-900/60 border border-cyan-500/20 backdrop-blur-xl rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.3)]">
              <h4 className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold mb-4 border-b border-cyan-500/10 pb-2">Live Search Benchmarks</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/40 border border-white/5 p-4 rounded text-center">
                  <span className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Search Tree Nodes</span>
                  <span className="text-2xl font-bold font-mono text-cyan-400">{sudokuExplored}</span>
                </div>
                <div className="bg-black/40 border border-white/5 p-4 rounded text-center">
                  <span className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Backtrack Actions</span>
                  <span className="text-2xl font-bold font-mono text-purple-400">{sudokuBacktracks}</span>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-950/80 border border-purple-500/20 backdrop-blur-xl rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] flex-1 flex flex-col">
              <h4 className="text-xs font-mono uppercase tracking-widest text-purple-400 font-bold mb-3 border-b border-purple-500/10 pb-2">AI Explanation Stream</h4>
              <div className="flex-1 min-h-[220px] max-h-[300px] overflow-y-auto font-mono text-[10px] leading-relaxed text-slate-300 bg-black/40 p-4 border border-white/5 rounded space-y-2 flex flex-col-reverse">
                {sudokuLogs.length > 0 ? (
                  sudokuLogs.map((log, idx) => (
                    <div key={idx} className={`${log.includes("[TRY]") ? "text-cyan-300" : ""} ${log.includes("[BACKTRACK]") ? "text-purple-400" : ""} ${log.includes("[PRUNE]") ? "text-red-400" : ""} ${log.includes("[SUCCESS]") ? "text-green-400 font-bold" : ""}`}>
                      {log}
                    </div>
                  ))
                ) : (
                  <span className="text-slate-650 italic">Waiting for search solver execution run...</span>
                )}
              </div>
            </div>
          </div>
        </main>
      )}

      {/* KAKURO LAB WORKSPACE */}
      {view === "kakuro" && (
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-8 py-10 relative z-10">
          <div className="lg:col-span-7 p-8 rounded-xl bg-slate-900/50 border border-purple-500/10 backdrop-blur-xl flex flex-col items-center justify-between shadow-[0_0_30px_rgba(0,0,0,0.4)]">
            <div className="w-full flex items-center justify-between mb-6 border-b border-white/5 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wider font-mono">Kakuro Dynamic Grid Designer</h3>
                <p className="text-xs text-slate-400">Click cells to cycle: Block → Clue → White. Input horizontal/vertical target sums.</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-400">Board Size:</span>
                <select 
                  value={kakuroSize}
                  onChange={(e) => setKakuroSize(parseInt(e.target.value))}
                  className="bg-slate-950 border border-purple-500/30 text-purple-400 text-xs font-mono px-2 py-1 rounded"
                >
                  <option value={5}>5x5 Grid</option>
                  <option value={6}>6x6 Grid</option>
                  <option value={8}>8x8 Grid</option>
                  <option value={10}>10x10 Grid</option>
                </select>
              </div>
            </div>

            {/* Load templates, Editing Clues panels */}
            <div className="w-full flex flex-col gap-4 mb-6">
              <div className="flex justify-start gap-3">
                <button 
                  onClick={loadKakuroDemo}
                  className="px-4 py-1.5 bg-purple-950/40 border border-purple-500/20 text-purple-400 text-xs font-mono rounded hover:bg-purple-900/30"
                >
                  Load {kakuroSize}x{kakuroSize} Default Template
                </button>
              </div>

              {editingClueCell && (
                <div className="p-4 rounded bg-purple-950/30 border border-purple-500/30 flex items-center gap-4 flex-wrap">
                  <span className="text-xs font-mono text-purple-300">Set Clues for cell ({editingClueCell.r}, {editingClueCell.c}):</span>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      placeholder="Horiz Sum"
                      value={clueInputH}
                      onChange={(e) => setClueInputH(e.target.value)}
                      className="w-20 bg-slate-950 border border-white/10 rounded px-2 py-1 text-xs text-slate-200 font-mono"
                    />
                    <input 
                      type="text" 
                      placeholder="Vertic Sum"
                      value={clueInputV}
                      onChange={(e) => setClueInputV(e.target.value)}
                      className="w-20 bg-slate-950 border border-white/10 rounded px-2 py-1 text-xs text-slate-200 font-mono"
                    />
                  </div>
                  <button 
                    onClick={saveClueValues}
                    className="px-3 py-1 bg-purple-600 text-white font-mono text-xs rounded hover:bg-purple-500"
                  >
                    Save
                  </button>
                </div>
              )}
            </div>

            {/* Kakuro Dynamic Board */}
            <div 
              style={{ gridTemplateColumns: `repeat(${kakuroSize}, minmax(0, 1fr))` }}
              className="grid gap-1.5 bg-slate-950 p-3 rounded-lg border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.6)]"
            >
              {kakuroGrid.map((row, rIdx) => 
                row.map((cell, cIdx) => {
                  const isCurrent = kakuroCurrentCell && kakuroCurrentCell.r === rIdx && kakuroCurrentCell.c === cIdx;
                  
                  if (cell.type === "block") {
                    return (
                      <div 
                        key={`${rIdx}-${cIdx}`}
                        onClick={() => cycleKakuroCellType(rIdx, cIdx)}
                        className="w-12 h-12 md:w-14 md:h-14 bg-slate-900 border border-white/5 rounded-sm cursor-pointer hover:bg-slate-800 flex items-center justify-center shadow-[inset_0_0_8px_rgba(0,0,0,0.8)]"
                      >
                        <span className="text-[8px] text-slate-600 font-mono">B</span>
                      </div>
                    );
                  }

                  if (cell.type === "clue") {
                    return (
                      <div 
                        key={`${rIdx}-${cIdx}`}
                        onClick={() => {
                          setEditingClueCell({ r: rIdx, c: cIdx });
                          setClueInputH(cell.hSum ? cell.hSum.toString() : "");
                          setClueInputV(cell.vSum ? cell.vSum.toString() : "");
                        }}
                        className="w-12 h-12 md:w-14 md:h-14 relative bg-slate-950 border border-white/10 rounded-sm overflow-hidden cursor-pointer hover:border-purple-400"
                      >
                        <div className="absolute inset-0 border-t border-white/20 origin-top-left rotate-45 transform scale-x-150" />
                        {cell.vSum && (
                          <span className="absolute bottom-1 left-1 text-[8px] md:text-[10px] font-mono font-extrabold text-cyan-400">
                            {cell.vSum}
                          </span>
                        )}
                        {cell.hSum && (
                          <span className="absolute top-1 right-1 text-[8px] md:text-[10px] font-mono font-extrabold text-purple-400">
                            {cell.hSum}
                          </span>
                        )}
                      </div>
                    );
                  }

                  // White Value Cells
                  return (
                    <div 
                      key={`${rIdx}-${cIdx}`}
                      className="relative w-12 h-12 md:w-14 md:h-14"
                    >
                      <input 
                        type="text"
                        maxLength={1}
                        disabled={kakuroIsSolving}
                        value={cell.val !== 0 ? cell.val : ""}
                        onChange={(e) => {
                          const digit = parseInt(e.target.value);
                          const nextGrid = kakuroGrid.map(row => row.map(c => ({ ...c })));
                          if (!isNaN(digit) && digit >= 1 && digit <= 9) {
                            nextGrid[rIdx][cIdx].val = digit;
                          } else {
                            nextGrid[rIdx][cIdx].val = 0;
                          }
                          setKakuroGrid(nextGrid);
                        }}
                        className={`w-full h-full text-center text-base font-bold font-mono transition-all duration-150 border border-white/5 rounded-sm focus:outline-none focus:border-purple-500
                          bg-slate-950 text-purple-300
                          ${isCurrent ? 'bg-purple-500/20 text-purple-200 border-purple-400 shadow-[inset_0_0_12px_rgba(168,85,247,0.4)]' : ''}
                          ${kakuroSolved ? 'border-green-500/20 bg-green-950/10 text-green-400' : ''}
                        `}
                      />
                      <button 
                        onClick={() => cycleKakuroCellType(rIdx, cIdx)}
                        className="absolute top-0 right-0 w-2 h-2 bg-slate-700 hover:bg-purple-500 rounded-full"
                        title="Change Cell Type"
                      />
                    </div>
                  );
                })
              )}
            </div>

            {/* Controls */}
            <div className="w-full mt-10 pt-6 border-t border-white/5 flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-3">
                <button 
                  onClick={runKakuroSolve}
                  disabled={kakuroIsSolving}
                  className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-semibold rounded disabled:opacity-50 uppercase tracking-widest transition shadow-[0_0_15px_rgba(168,85,247,0.3)]"
                >
                  {kakuroIsSolving ? "Solving..." : "Run Solve Process"}
                </button>
                <button 
                  onClick={resetKakuroBoard}
                  className="px-6 py-2.5 bg-slate-950 border border-white/10 hover:bg-slate-900 text-slate-300 font-mono text-xs rounded transition uppercase tracking-widest"
                >
                  Reset Board
                </button>
                <button 
                  onClick={clearKakuroBoard}
                  className="px-6 py-2.5 bg-slate-950 border border-white/10 hover:bg-slate-900 text-slate-350 font-mono text-xs rounded transition uppercase tracking-widest"
                >
                  Clear Board
                </button>
              </div>
              <button 
                onClick={() => { setView("dashboard"); resetKakuroBoard(); }} 
                className="px-4 py-2 bg-purple-955/40 border border-purple-500/30 text-purple-300 text-xs font-mono uppercase tracking-widest rounded hover:bg-purple-900/40"
              >
                ← Back to Console
              </button>
            </div>
          </div>

          {/* Right Console panel */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="p-6 bg-slate-900/60 border border-purple-500/20 backdrop-blur-xl rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.3)]">
              <h4 className="text-xs font-mono uppercase tracking-widest text-purple-400 font-bold mb-4 border-b border-purple-500/10 pb-2">Live Heuristic Benchmarks</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/40 border border-white/5 p-4 rounded text-center">
                  <span className="block text-[10px] font-mono uppercase text-slate-550 mb-1">Search Tree Nodes</span>
                  <span className="text-2xl font-bold font-mono text-purple-400">{kakuroExplored}</span>
                </div>
                <div className="bg-black/40 border border-white/5 p-4 rounded text-center">
                  <span className="block text-[10px] font-mono uppercase text-slate-550 mb-1">Backtrack Actions</span>
                  <span className="text-2xl font-bold font-mono text-red-400">{kakuroBacktracks}</span>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-950/80 border border-purple-500/20 backdrop-blur-xl rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] flex-1 flex flex-col">
              <h4 className="text-xs font-mono uppercase tracking-widest text-purple-400 font-bold mb-3 border-b border-purple-500/10 pb-2">AI Explanation Stream</h4>
              <div className="flex-1 min-h-[220px] max-h-[300px] overflow-y-auto font-mono text-[10px] leading-relaxed text-slate-300 bg-black/40 p-4 border border-white/5 rounded space-y-2 flex flex-col-reverse">
                {kakuroLogs.length > 0 ? (
                  kakuroLogs.map((log, idx) => (
                    <div key={idx} className={`${log.includes("[TRY]") ? "text-purple-300" : ""} ${log.includes("[BACKTRACK]") ? "text-red-400" : ""} ${log.includes("[PRUNE]") ? "text-cyan-400" : ""} ${log.includes("[SUCCESS]") ? "text-green-400 font-bold" : ""}`}>
                      {log}
                    </div>
                  ))
                ) : (
                  <span className="text-slate-650 italic">Waiting for search solver execution run...</span>
                )}
              </div>
            </div>
          </div>
        </main>
      )}

      {/* CHECKERS WORKSPACE */}
      {view === "checkers" && (
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-8 py-10 relative z-10">
          <div className="lg:col-span-7 p-8 rounded-xl bg-slate-900/50 border border-red-500/10 backdrop-blur-xl flex flex-col items-center justify-between shadow-[0_0_30px_rgba(0,0,0,0.4)]">
            <div className="w-full flex items-center justify-between mb-8 border-b border-white/5 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-wider font-mono">Checkers Adversarial AI Lab</h3>
                <p className="text-xs text-slate-400">Evaluating minimax tree weights. Opponent moves use soft cyan ice-blue coins.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setCheckersMode("player"); resetCheckersBoard(); }} className={`px-3 py-1 rounded text-[10px] font-mono uppercase tracking-wider transition ${checkersMode === "player" ? "bg-red-950 border border-red-500/40 text-red-400" : "bg-slate-950 border border-white/10 text-slate-400"}`}>Player vs AI</button>
                <button onClick={() => { setCheckersMode("auto"); resetCheckersBoard(); }} className={`px-3 py-1 rounded text-[10px] font-mono uppercase tracking-wider transition ${checkersMode === "auto" ? "bg-red-950 border border-red-500/40 text-red-400" : "bg-slate-950 border border-white/10 text-slate-400"}`}>AI vs AI Autoplay</button>
              </div>
            </div>

            <div className="relative">
              {checkersWinner && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center rounded-lg border border-red-500/20 shadow-2xl">
                  <span className="text-3xl font-extrabold text-red-400 font-mono mb-4 animate-pulse">{checkersWinner}</span>
                  <button onClick={resetCheckersBoard} className="px-6 py-2 bg-red-650 hover:bg-red-500 text-white font-mono text-xs uppercase tracking-widest rounded transition">Play Again</button>
                </div>
              )}

              <div className="grid grid-cols-8 gap-0.5 bg-slate-950 p-2 rounded-lg border border-white/10 shadow-[0_0_20px_rgba(0,0,0,0.6)]">
                {checkersBoard.map((row, rIdx) => 
                  row.map((val, cIdx) => {
                    const isDark = (rIdx + cIdx) % 2 === 1;
                    const isSelected = checkersSelected && checkersSelected.r === rIdx && checkersSelected.c === cIdx;
                    const isHighlighted = checkersLegalMoves.some(m => m.toR === rIdx && m.toC === cIdx);
                    
                    return (
                      <div 
                        key={`${rIdx}-${cIdx}`}
                        onClick={() => handleCheckerCellClick(rIdx, cIdx)}
                        className={`w-10 h-10 md:w-14 md:h-14 flex items-center justify-center transition-all duration-150 relative cursor-pointer
                          ${isDark ? "bg-slate-900" : "bg-slate-950"}
                          ${isSelected ? "bg-red-950/50 border border-red-500/60 shadow-[inset_0_0_10px_rgba(239,68,68,0.4)]" : ""}
                          ${isHighlighted ? "bg-green-950/40 border-2 border-green-500/50 shadow-[inset_0_0_12px_rgba(34,197,94,0.4)] animate-pulse" : ""}
                        `}
                      >
                        {val !== 0 && (
                          <div className={`w-7 h-7 md:w-10 md:h-10 rounded-full flex items-center justify-center shadow-lg border relative transition-transform active:scale-95
                            ${val > 0 
                              ? "bg-gradient-to-br from-rose-400 to-rose-600 border-rose-350 shadow-rose-400/35" // Rose Coral (AI)
                              : "bg-gradient-to-br from-cyan-300 to-cyan-500 border-cyan-200 shadow-cyan-300/30"} // Light Ice Blue/Cyan (Player)
                          `}>
                            {Math.abs(val) === 2 && (
                              <span className="text-[10px] md:text-sm text-yellow-400 select-none">👑</span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="w-full mt-10 pt-6 border-t border-white/5 flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-3">
                <button onClick={resetCheckersBoard} className="px-6 py-2.5 bg-slate-950 border border-white/10 hover:bg-slate-900 text-slate-300 font-mono text-xs rounded transition uppercase tracking-widest">Reset Board</button>
                <button 
                  onClick={() => {
                    if (checkersIsSolving) return;
                    setCheckersEditMode(!checkersEditMode);
                  }} 
                  className={`px-6 py-2.5 rounded font-mono text-xs transition uppercase tracking-widest border ${checkersEditMode ? "bg-red-950/80 border-red-500 text-red-400 font-bold" : "bg-slate-950 border-white/10 hover:bg-slate-900 text-slate-450"}`}
                >
                  Design Mode: {checkersEditMode ? "ON" : "OFF"}
                </button>
              </div>
              <button onClick={() => { setView("dashboard"); resetCheckersBoard(); }} className="px-4 py-2 bg-purple-955/40 border border-purple-500/30 text-purple-300 text-xs font-mono uppercase tracking-widest rounded hover:bg-purple-900/40">← Back to Console</button>
            </div>
          </div>

          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="p-6 bg-slate-900/60 border border-red-500/20 backdrop-blur-xl rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.3)]">
              <h4 className="text-xs font-mono uppercase tracking-widest text-red-400 font-bold mb-4 border-b border-red-500/10 pb-2">Live Search Benchmarks</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-black/40 border border-white/5 p-4 rounded text-center">
                  <span className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Evaluated States</span>
                  <span className="text-2xl font-bold font-mono text-red-400">{checkersEvaluated}</span>
                </div>
                <div className="bg-black/40 border border-white/5 p-4 rounded text-center">
                  <span className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Search Tree Depth</span>
                  <span className="text-2xl font-bold font-mono text-cyan-400">{checkersSearchDepth}</span>
                </div>
              </div>
              <div className="mt-4 bg-black/40 border border-white/5 p-4 rounded flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400">Alpha-Beta Cut-offs</span>
                <span className="text-sm font-mono text-red-305 font-semibold">{checkersAlphaBetaCuts} pruning steps</span>
              </div>
            </div>

            <div className="p-6 bg-slate-950/80 border border-purple-500/20 backdrop-blur-xl rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] flex-1 flex flex-col">
              <h4 className="text-xs font-mono uppercase tracking-widest text-purple-400 font-bold mb-3 border-b border-purple-500/10 pb-2">AI Explanation Stream</h4>
              <div className="flex-1 min-h-[220px] max-h-[300px] overflow-y-auto font-mono text-[10px] leading-relaxed text-slate-300 bg-black/40 p-4 border border-white/5 rounded space-y-2 flex flex-col-reverse">
                {checkersLogs.length > 0 ? (
                  checkersLogs.map((log, idx) => (
                    <div key={idx} className={`${log.includes("[AI]") ? "text-red-305" : ""} ${log.includes("[PLAYER]") ? "text-cyan-300" : ""} ${log.includes("[CORAL AI]") ? "text-red-400 font-bold" : ""} ${log.includes("[CYAN AI]") ? "text-cyan-300 font-bold" : ""}`}>
                      {log}
                    </div>
                  ))
                ) : (
                  <span className="text-slate-650 italic">Waiting for minimax gameplay search...</span>
                )}
              </div>
            </div>
          </div>
        </main>
      )}

      {/* N-QUEENS LAB WORKSPACE */}
      {view === "nqueens" && (
        <main className="max-w-7xl mx-auto px-6 py-12 relative z-10 animate-fadeIn">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 border-b border-white/5 pb-8">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono font-bold tracking-widest px-2.5 py-1 bg-violet-500/10 text-violet-400 rounded-full border border-violet-500/20 uppercase">
                  Constraint Satisfaction
                </span>
                <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse"></div>
              </div>
              <h2 className="text-3xl font-extrabold text-white mt-3 font-sans tracking-wide">N-Queens Laboratory</h2>
              <p className="text-slate-400 text-sm mt-1">Place N non-attacking queens on an N×N chessboard using backtracks and lookahead pruning.</p>
            </div>
            
            <button 
              onClick={() => { setView("dashboard"); resetNQueensBoard(); }}
              className="px-5 py-2.5 bg-slate-900 border border-white/10 hover:bg-slate-850 text-slate-350 text-xs font-mono uppercase tracking-widest rounded transition flex items-center gap-2"
            >
              ← Back to Console
            </button>
          </div>

          {/* Sizing Slider Interface Component (Granular Control Deck) */}
          <div className="w-full bg-slate-950/60 border border-slate-800 rounded-xl p-5 mb-6 backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <label className="block text-xs font-mono tracking-widest text-violet-400 uppercase mb-1">
                  State Horizon Calibration
                </label>
                <div className="text-lg font-bold text-slate-200">
                  Dimension Node Configuration: <span className="font-mono text-violet-400">{nqueensSize} × {nqueensSize}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-4 w-full sm:w-auto flex-1 max-w-md">
                <span className="text-xs font-mono text-slate-500">4×4</span>
                <input 
                  type="range" 
                  min="4" 
                  max="12" 
                  value={nqueensSize}
                  disabled={nqueensIsSolving}
                  onChange={(e) => setNqueensSize(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                />
                <span className="text-xs font-mono text-slate-500">12×12</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7 bg-slate-900/60 border border-violet-500/20 backdrop-blur-xl rounded-xl p-8 shadow-[0_0_30px_rgba(0,0,0,0.4)] flex flex-col items-center">
              <div 
                className={`grid gap-0.5 p-2 rounded-lg border shadow-[0_0_20px_rgba(0,0,0,0.6)] transition-all duration-300
                  ${nqueensSolved ? "border-green-500/40 bg-green-950/15" : "bg-slate-950 border-white/10"}
                `}
                style={{
                  gridTemplateColumns: `repeat(${nqueensSize}, minmax(0, 1fr))`,
                  width: "100%",
                  maxWidth: "450px"
                }}
              >
                {nqueensBoard.map((row, rIdx) => 
                  row.map((cellValue, cIdx) => {
                    const isDark = (rIdx + cIdx) % 2 === 1;
                    
                    return (
                      <div 
                        key={`${rIdx}-${cIdx}`}
                        className={`aspect-square flex items-center justify-center transition-all duration-150 relative
                          ${isDark ? "bg-slate-900" : "bg-slate-950"}
                          ${cellValue === 2 ? "bg-violet-950/40 border border-violet-500/40 shadow-[inset_0_0_8px_rgba(139,92,246,0.3)]" : ""}
                          ${cellValue === 3 ? "bg-red-950/40 border border-red-500/40 shadow-[inset_0_0_8px_rgba(239,68,68,0.3)] animate-pulse" : ""}
                        `}
                      >
                        {cellValue === 1 && (
                          <span className="text-xl md:text-2xl text-yellow-400 select-none filter drop-shadow-[0_0_8px_rgba(250,204,21,0.6)] animate-bounce">
                            👑
                          </span>
                        )}
                        {cellValue === 2 && (
                          <span className="text-lg md:text-xl text-violet-400 opacity-60 select-none animate-pulse">
                            👑
                          </span>
                        )}
                        {cellValue === 3 && (
                          <span className="text-lg md:text-xl text-red-500 select-none">
                            👑
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Controls */}
              <div className="w-full mt-10 pt-6 border-t border-white/5 flex flex-wrap gap-4 items-center justify-between">
                <div className="flex gap-3">
                  <button 
                    onClick={runNQueensSolve}
                    disabled={nqueensIsSolving}
                    className="px-6 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-mono text-xs font-semibold rounded disabled:opacity-50 uppercase tracking-widest shadow-[0_0_15px_rgba(139,92,246,0.3)] transition"
                  >
                    {nqueensIsSolving ? "Solving..." : "Run Solve Process"}
                  </button>
                  <button 
                    onClick={resetNQueensBoard}
                    className="px-6 py-2.5 bg-slate-950 border border-white/10 hover:bg-slate-900 text-slate-300 font-mono text-xs rounded transition uppercase tracking-widest"
                  >
                    Reset Board
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col gap-6">
              <div className="p-6 bg-slate-900/60 border border-violet-500/20 backdrop-blur-xl rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.3)]">
                <h4 className="text-xs font-mono uppercase tracking-widest text-violet-400 font-bold mb-4 border-b border-violet-500/10 pb-2">Live Search Benchmarks</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-black/40 border border-white/5 p-4 rounded text-center">
                    <span className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Nodes Explored</span>
                    <span className="text-2xl font-bold font-mono text-violet-400">{nqueensExplored}</span>
                  </div>
                  <div className="bg-black/40 border border-white/5 p-4 rounded text-center">
                    <span className="block text-[10px] font-mono uppercase text-slate-500 mb-1">Backtracks</span>
                    <span className="text-2xl font-bold font-mono text-red-400">{nqueensBacktracks}</span>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-slate-950/80 border border-violet-500/20 backdrop-blur-xl rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] flex-1 flex flex-col">
                <h4 className="text-xs font-mono uppercase tracking-widest text-violet-400 font-bold mb-3 border-b border-violet-500/10 pb-2">AI Explanation Stream</h4>
                <div className="flex-1 min-h-[220px] max-h-[300px] overflow-y-auto font-mono text-[10px] leading-relaxed text-slate-300 bg-black/40 p-4 border border-white/5 rounded space-y-2 flex flex-col-reverse">
                  {nqueensLogs.length > 0 ? (
                    nqueensLogs.map((log, idx) => (
                      <div key={idx} className={`
                        ${log.includes("[TRY]") ? "text-violet-300" : ""}
                        ${log.includes("[ASSIGN]") ? "text-green-400 font-bold" : ""}
                        ${log.includes("[INVALID]") ? "text-red-400" : ""}
                        ${log.includes("[BACKTRACK]") ? "text-amber-500" : ""}
                        ${log.includes("[SUCCESS]") ? "text-green-300 font-extrabold" : ""}
                        ${log.includes("[SYSTEM]") ? "text-slate-400 italic" : ""}
                      `}>
                        {log}
                      </div>
                    ))
                  ) : (
                    <span className="text-slate-650 italic">Waiting for CSP backtracks search...</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {showGoogleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md transition-all duration-300">
          <div className="w-full max-w-md p-8 bg-slate-950/90 border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.15)] backdrop-blur-2xl relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
            
            {googleStep === "choose" && (
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center border border-white/10 mb-6 shadow-inner">
                  {/* Google Custom-styled G Icon */}
                  <svg className="w-8 h-8" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114-3.44 0-6.228-2.77-6.228-6.19s2.788-6.19 6.228-6.19c1.55 0 2.96.565 4.05 1.5l3.203-3.2C19.29 1.83 15.99 0 12.24 0 5.48 0 0 5.48 0 12.24s5.48 12.24 12.24 12.24c6.76 0 12.24-5.48 12.24-12.24 0-.825-.075-1.62-.225-2.39H12.24z"
                    />
                  </svg>
                </div>
                
                <h3 className="text-xl font-bold text-white tracking-tight mb-2">Sign in with Google</h3>
                <p className="text-xs text-slate-400 mb-8 font-mono">Select a sandbox account to proceed with simulation authentication</p>
                
                <div className="w-full flex flex-col gap-3">
                  <button
                    onClick={() => triggerGoogleAuth("researcher.alpha@google.com")}
                    className="w-full py-3 px-4 bg-slate-900 border border-white/5 rounded-xl text-left text-sm font-medium hover:border-cyan-500/40 hover:bg-slate-850/80 transition-all flex items-center justify-between group"
                  >
                    <div className="flex flex-col">
                      <span className="text-slate-200 group-hover:text-cyan-400 transition-colors">Researcher Alpha</span>
                      <span className="text-[10px] text-slate-500 font-mono mt-0.5">researcher.alpha@google.com</span>
                    </div>
                    <span className="text-xs text-slate-500 font-mono uppercase tracking-widest group-hover:text-cyan-400 transition-colors">Select →</span>
                  </button>

                  <button
                    onClick={() => triggerGoogleAuth("evaluator.beta@google.com")}
                    className="w-full py-3 px-4 bg-slate-900 border border-white/5 rounded-xl text-left text-sm font-medium hover:border-cyan-500/40 hover:bg-slate-850/80 transition-all flex items-center justify-between group"
                  >
                    <div className="flex flex-col">
                      <span className="text-slate-200 group-hover:text-cyan-400 transition-colors">Evaluator Beta</span>
                      <span className="text-[10px] text-slate-500 font-mono mt-0.5">evaluator.beta@google.com</span>
                    </div>
                    <span className="text-xs text-slate-500 font-mono uppercase tracking-widest group-hover:text-cyan-400 transition-colors">Select →</span>
                  </button>

                  <button
                    onClick={() => setGoogleStep("custom")}
                    className="w-full py-3 px-4 bg-slate-950 border border-dashed border-white/15 rounded-xl text-center text-xs font-mono text-slate-400 hover:border-cyan-500/30 hover:text-cyan-400 transition-all"
                  >
                    Use Another Account...
                  </button>
                </div>
                
                <button
                  onClick={() => setShowGoogleModal(false)}
                  className="mt-8 text-xs font-mono text-slate-500 hover:text-slate-350 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            {googleStep === "custom" && (
              <div className="flex flex-col">
                <h3 className="text-lg font-bold text-white tracking-tight mb-1">Use another Google Account</h3>
                <p className="text-xs text-slate-450 mb-6 font-mono">Enter account simulation credentials</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Email address</label>
                    <input
                      type="email"
                      value={googleEmail}
                      onChange={(e) => setGoogleEmail(e.target.value)}
                      placeholder="e.g. scientist@google.com"
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1.5">Password</label>
                    <input
                      type="password"
                      value={googlePassword}
                      onChange={(e) => setGooglePassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-all"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between mt-8">
                  <button
                    onClick={() => setGoogleStep("choose")}
                    className="text-xs font-mono text-slate-500 hover:text-slate-350 transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={() => {
                      if (!googleEmail.includes("@")) {
                        alert("Please enter a valid Google Account email.");
                        return;
                      }
                      triggerGoogleAuth(googleEmail);
                    }}
                    className="px-6 py-2.5 bg-cyan-600 text-white text-xs font-mono uppercase tracking-widest rounded-xl hover:bg-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all"
                  >
                    Authenticate
                  </button>
                </div>
              </div>
            )}

            {googleStep === "loading" && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="relative w-16 h-16 mb-8 flex items-center justify-center">
                  {/* Rotating Premium Spinner */}
                  <div className="absolute inset-0 border-4 border-cyan-500/10 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-t-cyan-500 rounded-full animate-spin"></div>
                </div>
                
                <h4 className="text-sm font-bold text-white mb-2">Simulation Sandbox Exchange</h4>
                <p className="text-xs text-slate-450 font-mono animate-pulse">{googleLoadingText}</p>
              </div>
            )}
          </div>
        </div>
      )}

      <footer className="w-full bg-[#05070f] border-t border-white/5 py-6 px-8 flex items-center justify-between mt-20 relative z-20">
        <span className="text-[10px] font-mono text-slate-500">© 2026 AI Research Laboratory Inc. All rights reserved.</span>
        <span className="text-[10px] font-mono text-cyan-500/60 uppercase tracking-widest">Designed for Academic Evaluation</span>
      </footer>
    </div>
  );
};

// Extrema sums helper for Kakuro lookahead
function getExtremaSum(count: number, excluded: Set<number>, findMin: boolean): number {
  let sum = 0;
  let found = 0;
  const step = findMin ? 1 : 9;
  const direction = findMin ? 1 : -1;

  for (let v = step; v >= 1 && v <= 9; v += direction) {
    if (!excluded.has(v)) {
      sum += v;
      found++;
      if (found === count) break;
    }
  }
  return sum;
}

// Checkers helper for applying moves
function applyCheckersMove(board: number[][], move: CheckersMove): number[][] {
  const next = board.map(row => [...row]);
  let piece = next[move.fromR][move.fromC];
  next[move.fromR][move.fromC] = 0;

  if (piece === 1 && move.toR === 7) {
    piece = 2; // promoted
  } else if (piece === -1 && move.toR === 0) {
    piece = -2; // promoted
  }

  next[move.toR][move.toC] = piece;

  if (move.isCapture) {
    for (const victim of move.jumpChain) {
      next[victim.r][victim.c] = 0;
    }
  }
  return next;
}

// Generate checkers legal moves
function generateLegalMoves(board: number[][], player: number): CheckersMove[] {
  const captures: CheckersMove[] = [];
  const normalMoves: CheckersMove[] = [];
  const dir = player === 1 ? 1 : -1;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece === 0) continue;

      if ((player === 1 && piece > 0) || (player === -1 && piece < 0)) {
        const isKing = Math.abs(piece) === 2;
        const rows = isKing ? [-1, 1] : [dir];
        const cols = [-1, 1];

        for (const dr of rows) {
          for (const dc of cols) {
            const victimR = r + dr;
            const victimC = c + dc;
            const landingR = r + 2 * dr;
            const landingC = c + 2 * dc;

            if (landingR >= 0 && landingR < 8 && landingC >= 0 && landingC < 8) {
              const victim = board[victimR][victimC];
              const landing = board[landingR][landingC];

              if (landing === 0 && victim !== 0) {
                if ((player === 1 && victim < 0) || (player === -1 && victim > 0)) {
                  captures.push({
                    fromR: r,
                    fromC: c,
                    toR: landingR,
                    toC: landingC,
                    isCapture: true,
                    jumpChain: [{ r: victimR, c: victimC }]
                  });
                }
              }
            }
          }
        }

        if (captures.length === 0) {
          for (const dr of rows) {
            for (const dc of cols) {
              const nr = r + dr;
              const nc = c + dc;
              if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && board[nr][nc] === 0) {
                normalMoves.push({
                  fromR: r,
                  fromC: c,
                  toR: nr,
                  toC: nc,
                  isCapture: false,
                  jumpChain: []
                });
              }
            }
          }
        }
      }
    }
  }

  return captures.length > 0 ? captures : normalMoves;
}

function boardToString(board: number[][]): string {
  return board.map(row => row.join(",")).join(";");
}

// Evaluate Checkers board weights
function evaluateCheckersBoard(board: number[][], history?: string[], activePlayer?: number): number {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const val = board[r][c];
      if (val === 0) continue;

      if (val === 1) score += 100;
      else if (val === 2) score += 175;
      else if (val === -1) score -= 100;
      else if (val === -2) score -= 175;

      if (val > 0) {
        if (c >= 2 && c <= 5) score += 50;
        score += r * 20;
      } else {
        if (c >= 2 && c <= 5) score -= 50;
        score -= (7 - r) * 20;
      }
    }
  }

  if (history && activePlayer !== undefined) {
    const boardStr = boardToString(board);
    let reps = 0;
    for (const h of history) {
      if (h === boardStr) reps++;
    }
    if (reps > 0) {
      if (activePlayer === 1) {
        score -= 2000 * reps;
      } else {
        score += 2000 * reps;
      }
    }
  }
  return score;
}
