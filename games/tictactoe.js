/* ============================================
   井字棋 · Game Module
   导出 TicTacToeGame 类，供 play-tictactoe.html 使用
   玩家执 X（紫色），AI 执 O（粉色），永不落败的 Minimax AI
   ============================================ */

class TicTacToeGame {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.onScoreChange = options.onScoreChange || (() => {});
    this.onGameOver = options.onGameOver || (() => {});

    this.reset();
  }

  reset() {
    // 3x3 棋盘：0=空, 1=玩家(X), 2=AI(O)
    this.board = [
      [0, 0, 0],
      [0, 0, 0],
      [0, 0, 0],
    ];
    this.playerTurn = true;    // true=玩家, false=AI
    this.winner = 0;           // 0=无, 1=玩家, 2=AI, 3=平局
    this.gameResult = null;    // 'win' | 'lose' | 'draw' | null
    this.score = 0;
    this.wins = 0;
    this.losses = 0;
    this.draws = 0;
    this.highScore = parseInt(localStorage.getItem('tictactoe_high') || '0');
    this.isRunning = false;
    this.isGameOver = false;
    this.isPaused = false;     // AI 思考时暂停点击
    this.aiThinking = false;
    this.lastMove = null;      // { row, col } 最后落子位置

    this.render();
  }

  // ========== Canvas 坐标转棋盘坐标 ==========
  getGridPos(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const canvasX = (clientX - rect.left) * scaleX;
    const canvasY = (clientY - rect.top) * scaleY;
    const gs = this.canvas.width / 3;
    const col = Math.floor(canvasX / gs);
    const row = Math.floor(canvasY / gs);
    if (row >= 0 && row < 3 && col >= 0 && col < 3) {
      return { row, col };
    }
    return null;
  }

  // ========== 玩家点击 ==========
  handleClick(clientX, clientY) {
    if (!this.isRunning || this.isGameOver || !this.playerTurn || this.aiThinking) return;

    const pos = this.getGridPos(clientX, clientY);
    if (!pos) return;
    const { row, col } = pos;

    if (this.board[row][col] !== 0) return;

    // 玩家落子
    this.board[row][col] = 1;
    this.lastMove = { row, col };
    this.playerTurn = false;

    // 检查玩家是否赢了
    if (this.checkWin(1)) {
      this.winner = 1;
      this.score += 100;
      this.wins++;
      this.onScoreChange(this.score);
      this.endGame('win');
      return;
    }

    // 检查平局
    if (this.isBoardFull()) {
      this.winner = 3;
      this.draws++;
      this.endGame('draw');
      return;
    }

    // AI 回合
    this.render();
    this.aiMove();
  }

  // ========== AI 走棋（Minimax） ==========
  aiMove() {
    this.aiThinking = true;
    this.lastMove = null;

    // 模拟思考延迟（更有对弈感）
    setTimeout(() => {
      if (this.isGameOver || !this.isRunning) {
        this.aiThinking = false;
        return;
      }

      const move = this.minimax(this.board, 2);
      if (move && this.board[move.row][move.col] === 0) {
        this.board[move.row][move.col] = 2;
        this.lastMove = { row: move.row, col: move.col };

        // 检查 AI 是否赢了
        if (this.checkWin(2)) {
          this.winner = 2;
          this.losses++;
          this.aiThinking = false;
          this.playerTurn = false;
          this.endGame('lose');
          return;
        }

        // 检查平局
        if (this.isBoardFull()) {
          this.winner = 3;
          this.draws++;
          this.aiThinking = false;
          this.playerTurn = false;
          this.endGame('draw');
          return;
        }

        this.playerTurn = true;
      }
      this.aiThinking = false;
      this.render();
    }, 150); // 150ms 思考延迟
  }

  // ========== Minimax 算法 ==========
  minimax(board, player, alpha = -Infinity, beta = Infinity) {
    // 检查终局
    const winner = this.getWinner(board);
    if (winner === 2) return { score: 10 };
    if (winner === 1) return { score: -10 };
    if (this.isBoardFullStatic(board)) return { score: 0 };

    let bestMove = null;

    if (player === 2) {
      // AI 最大化
      let bestScore = -Infinity;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          if (board[r][c] === 0) {
            board[r][c] = 2;
            const result = this.minimax(board, 1, alpha, beta);
            board[r][c] = 0;
            if (result.score > bestScore) {
              bestScore = result.score;
              bestMove = { row: r, col: c, score: bestScore };
            }
            alpha = Math.max(alpha, bestScore);
            if (beta <= alpha) break;
          }
        }
        if (beta <= alpha) break;
      }
      return bestMove || { score: 0 };
    } else {
      // 玩家最小化
      let bestScore = Infinity;
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          if (board[r][c] === 0) {
            board[r][c] = 1;
            const result = this.minimax(board, 2, alpha, beta);
            board[r][c] = 0;
            if (result.score < bestScore) {
              bestScore = result.score;
              bestMove = { row: r, col: c, score: bestScore };
            }
            beta = Math.min(beta, bestScore);
            if (beta <= alpha) break;
          }
        }
        if (beta <= alpha) break;
      }
      return bestMove || { score: 0 };
    }
  }

  getWinner(board) {
    // 行
    for (let r = 0; r < 3; r++) {
      if (board[r][0] !== 0 && board[r][0] === board[r][1] && board[r][1] === board[r][2]) {
        return board[r][0];
      }
    }
    // 列
    for (let c = 0; c < 3; c++) {
      if (board[0][c] !== 0 && board[0][c] === board[1][c] && board[1][c] === board[2][c]) {
        return board[0][c];
      }
    }
    // 对角线
    if (board[0][0] !== 0 && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
      return board[0][0];
    }
    if (board[0][2] !== 0 && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
      return board[0][2];
    }
    return 0;
  }

  isBoardFullStatic(board) {
    return board.every(row => row.every(cell => cell !== 0));
  }

  // ========== 胜负判定 ==========
  checkWin(player) {
    const b = this.board;
    // 行
    for (let r = 0; r < 3; r++) {
      if (b[r][0] === player && b[r][1] === player && b[r][2] === player) return true;
    }
    // 列
    for (let c = 0; c < 3; c++) {
      if (b[0][c] === player && b[1][c] === player && b[2][c] === player) return true;
    }
    // 对角线
    if (b[0][0] === player && b[1][1] === player && b[2][2] === player) return true;
    if (b[0][2] === player && b[1][1] === player && b[2][0] === player) return true;
    return false;
  }

  isBoardFull() {
    return this.board.every(row => row.every(cell => cell !== 0));
  }

  // ========== 游戏结束 ==========
  endGame(result) {
    this.isGameOver = true;
    this.isRunning = false;
    this.gameResult = result;

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('tictactoe_high', String(this.highScore));
    }

    this.render();

    const messages = {
      win: { icon: '🎉', title: '你赢了！', msg: '干得漂亮，这次是你赢了！' },
      lose: { icon: '💀', title: '你输了', msg: 'AI 永不落败，再试一次？' },
      draw: { icon: '🤝', title: '平局', msg: '棋盘已满，旗鼓相当！' },
    };
    const m = messages[result];
    this.onGameOver(m.msg, this.score, this.highScore, result === 'win');
  }

  // ========== 游戏控制 ==========
  start() {
    if (this.isRunning) return;
    if (this.isGameOver) {
      this.reset();
    }
    this.isRunning = true;
    this.isGameOver = false;
    this.isPaused = false;
    this.playerTurn = true;
    this.winner = 0;
    this.render();
  }

  stop() {
    this.isRunning = false;
  }

  pause() {
    this.isPaused = true;
    this.render();
  }

  resume() {
    this.isPaused = false;
    this.render();
  }

  togglePause() {
    if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  destroy() {
    this.unbindControls();
  }

  // ========== 渲染 ==========
  render() {
    const ctx = this.ctx;
    const size = this.canvas.width;
    const gs = size / 3;
    const margin = 12;

    // 背景
    ctx.fillStyle = '#0d0d14';
    ctx.fillRect(0, 0, size, size);

    // 绘制网格线
    ctx.strokeStyle = 'rgba(30, 30, 48, 0.5)';
    ctx.lineWidth = 2;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * gs, margin);
      ctx.lineTo(i * gs, size - margin);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(margin, i * gs);
      ctx.lineTo(size - margin, i * gs);
      ctx.stroke();
    }

    // 绘制棋子
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        if (this.board[r][c] === 0) continue;

        const cx = c * gs + gs / 2;
        const cy = r * gs + gs / 2;
        const radius = gs * 0.35;

        if (this.board[r][c] === 1) {
          // 玩家 X — 紫色
          const isLast = this.lastMove && this.lastMove.row === r && this.lastMove.col === c;
          ctx.strokeStyle = '#6c5ce7';
          ctx.lineWidth = isLast ? 5 : 4;
          ctx.shadowColor = '#6c5ce7';
          ctx.shadowBlur = isLast ? 10 : 4;
          const pad = gs * 0.22;
          ctx.beginPath();
          ctx.moveTo(cx - pad, cy - pad);
          ctx.lineTo(cx + pad, cy + pad);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cx + pad, cy - pad);
          ctx.lineTo(cx - pad, cy + pad);
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else if (this.board[r][c] === 2) {
          // AI O — 粉色
          const isLast = this.lastMove && this.lastMove.row === r && this.lastMove.col === c;
          ctx.strokeStyle = '#fd79a8';
          ctx.lineWidth = isLast ? 4 : 3.5;
          ctx.shadowColor = '#fd79a8';
          ctx.shadowBlur = isLast ? 10 : 4;
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }
    }

    // 胜利连线
    if (this.isGameOver && this.winner !== 3) {
      this.drawWinLine(ctx, gs);
    }

    // AI 思考提示
    if (this.aiThinking) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#e8e8f0';
      ctx.font = '20px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🤔 AI 思考中...', size / 2, size / 2);
    }

    // 暂停
    if (this.isPaused && !this.isGameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#e8e8f0';
      ctx.font = '24px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⏸ 暂停中', size / 2, size / 2);
    }
  }

  drawWinLine(ctx, gs) {
    const b = this.board;
    ctx.strokeStyle = this.winner === 1 ? '#6c5ce7' : '#fd79a8';
    ctx.lineWidth = 4;
    ctx.shadowColor = this.winner === 1 ? '#6c5ce7' : '#fd79a8';
    ctx.shadowBlur = 15;

    // 检查所有赢线
    const lines = [];
    // 行
    for (let r = 0; r < 3; r++) {
      if (b[r][0] !== 0 && b[r][0] === b[r][1] && b[r][1] === b[r][2]) {
        lines.push({ x1: 0, y1: r * gs + gs / 2, x2: 3 * gs, y2: r * gs + gs / 2 });
      }
    }
    // 列
    for (let c = 0; c < 3; c++) {
      if (b[0][c] !== 0 && b[0][c] === b[1][c] && b[1][c] === b[2][c]) {
        lines.push({ x1: c * gs + gs / 2, y1: 0, x2: c * gs + gs / 2, y2: 3 * gs });
      }
    }
    // 对角线
    if (b[0][0] !== 0 && b[0][0] === b[1][1] && b[1][1] === b[2][2]) {
      lines.push({ x1: 0, y1: 0, x2: 3 * gs, y2: 3 * gs });
    }
    if (b[0][2] !== 0 && b[0][2] === b[1][1] && b[1][1] === b[2][0]) {
      lines.push({ x1: 3 * gs, y1: 0, x2: 0, y2: 3 * gs });
    }

    for (const line of lines) {
      ctx.beginPath();
      ctx.moveTo(line.x1, line.y1);
      ctx.lineTo(line.x2, line.y2);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  // ========== 键盘绑定 ==========
  bindControls() {
    this._clickHandler = (e) => {
      e.preventDefault();
      this.handleClick(e.clientX, e.clientY);
    };
    this.canvas.addEventListener('click', this._clickHandler);

    // 触屏支持
    this._touchHandler = (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) this.handleClick(touch.clientX, touch.clientY);
    };
    this.canvas.addEventListener('touchstart', this._touchHandler, { passive: false });

    // 键盘快捷键
    this._keyHandler = (e) => {
      if (e.key === 'r' || e.key === 'R') {
        if (this.isGameOver && this.onRestart) this.onRestart();
      }
      if (e.key === 'p' || e.key === 'P') {
        this.togglePause();
      }
    };
    document.addEventListener('keydown', this._keyHandler);
  }

  unbindControls() {
    if (this._clickHandler) {
      this.canvas.removeEventListener('click', this._clickHandler);
    }
    if (this._touchHandler) {
      this.canvas.removeEventListener('touchstart', this._touchHandler);
    }
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
    }
  }

  destroy() {
    this.stop();
    this.unbindControls();
  }
}

// 注册到全局游戏注册表
window.__GAMES = window.__GAMES || {};
window.__GAMES.tictactoe = TicTacToeGame;