/* ============================================
   扫雷 · Game Module
   经典扫雷，9x9 棋盘，10 颗地雷
   左键翻开，右键旗标
   ============================================ */

class MinesweeperGame {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.onScoreChange = options.onScoreChange || (() => {});
    this.onGameOver = options.onGameOver || (() => {});

    this.COLS = 9;
    this.ROWS = 9;
    this.MINE_COUNT = 10;
    this.gridSize = Math.floor(this.canvas.width / this.COLS);

    this.reset();
  }

  reset() {
    this.board = [];       // 数字：-1=地雷，0~8=周围雷数
    this.visible = [];     // true=已翻开
    this.flags = [];       // true=已标记旗
    this.minesPlaced = false;
    this.firstClick = true;
    this.score = 0;
    this.flagCount = 0;
    this.revealedCount = 0;
    this.highScore = parseInt(localStorage.getItem('minesweeper_high') || '0');
    this.isRunning = false;
    this.isGameOver = false;
    this.isPaused = false;

    // 初始化空棋盘
    for (let r = 0; r < this.ROWS; r++) {
      this.board[r] = [];
      this.visible[r] = [];
      this.flags[r] = [];
      for (let c = 0; c < this.COLS; c++) {
        this.board[r][c] = 0;
        this.visible[r][c] = false;
        this.flags[r][c] = false;
      }
    }

    this.render();
  }

  // ========== 布雷（第一次点击后，避免开局踩雷） ==========
  placeMines(safeR, safeC) {
    let placed = 0;
    while (placed < this.MINE_COUNT) {
      const r = Math.floor(Math.random() * this.ROWS);
      const c = Math.floor(Math.random() * this.COLS);
      // 不在安全格及其周围布雷
      if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
      if (this.board[r][c] === -1) continue;
      this.board[r][c] = -1;
      placed++;
    }

    // 计算数字
    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        if (this.board[r][c] === -1) continue;
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < this.ROWS && nc >= 0 && nc < this.COLS && this.board[nr][nc] === -1) count++;
          }
        }
        this.board[r][c] = count;
      }
    }

    this.minesPlaced = true;
  }

  // ========== 坐标转换 ==========
  getGridPos(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    const scale = this.canvas.width / rect.width;
    const x = (clientX - rect.left) * scale;
    const y = (clientY - rect.top) * scale;
    const col = Math.floor(x / this.gridSize);
    const row = Math.floor(y / this.gridSize);
    if (row >= 0 && row < this.ROWS && col >= 0 && col < this.COLS) return { row, col };
    return null;
  }

  // ========== 左键翻开 ==========
  reveal(row, col) {
    if (this.isGameOver || !this.isRunning || this.isPaused) return;
    if (this.visible[row][col] || this.flags[row][col]) return;

    // 第一次点击：布雷
    if (this.firstClick) {
      this.placeMines(row, col);
      this.firstClick = false;
    }

    // 踩雷
    if (this.board[row][col] === -1) {
      this.visible[row][col] = true;
      this.gameOver(false);
      return;
    }

    // 递归展开空白格
    this.floodFill(row, col);
    this.score += 10;
    this.onScoreChange(this.score);
    this.render();

    // 检查胜利
    if (this.checkWin()) {
      this.gameOver(true);
    }
  }

  floodFill(row, col) {
    if (row < 0 || row >= this.ROWS || col < 0 || col >= this.COLS) return;
    if (this.visible[row][col] || this.flags[row][col]) return;
    if (this.board[row][col] === -1) return;

    this.visible[row][col] = true;
    this.revealedCount++;

    // 如果是 0，递归展开相邻格
    if (this.board[row][col] === 0) {
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          this.floodFill(row + dr, col + dc);
        }
      }
    }
  }

  // ========== 右键标记旗 ==========
  toggleFlag(row, col) {
    if (this.isGameOver || !this.isRunning || this.isPaused) return;
    if (this.visible[row][col]) return;

    this.flags[row][col] = !this.flags[row][col];
    this.flagCount += this.flags[row][col] ? 1 : -1;
    this.render();
  }

  // ========== 胜利检测 ==========
  checkWin() {
    const totalCells = this.COLS * this.ROWS;
    return this.revealedCount === totalCells - this.MINE_COUNT;
  }

  // ========== 游戏结束 ==========
  gameOver(isWin) {
    this.isGameOver = true;
    this.isRunning = false;

    // 翻开所有地雷
    if (!isWin) {
      for (let r = 0; r < this.ROWS; r++) {
        for (let c = 0; c < this.COLS; c++) {
          if (this.board[r][c] === -1) this.visible[r][c] = true;
        }
      }
    }

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('minesweeper_high', String(this.highScore));
    }

    this.render();

    const msg = isWin ? '🎉 你赢了！所有地雷已排除！' : '💥 踩到地雷了！';
    this.onGameOver(msg, this.score, this.highScore, isWin);
  }

  // ========== 游戏控制 ==========
  start() {
    if (this.isRunning) return;
    if (this.isGameOver) this.reset();
    this.isRunning = true;
    this.isGameOver = false;
    this.isPaused = false;
    this.render();
  }

  stop() { this.isRunning = false; }

  pause() { this.isPaused = true; this.render(); }

  resume() { this.isPaused = false; this.render(); }

  togglePause() {
    if (this.isPaused) this.resume();
    else this.pause();
  }

  destroy() { this.unbindControls(); }

  // ========== 渲染 ==========
  render() {
    const ctx = this.ctx;
    const gs = this.gridSize;
    const size = this.canvas.width;

    ctx.fillStyle = '#0d0d14';
    ctx.fillRect(0, 0, size, size);

    // 辅助颜色
    const NUM_COLORS = {
      1: '#00cec9', 2: '#28c840', 3: '#ff5f57',
      4: '#6c5ce7', 5: '#fd79a8', 6: '#ff9f43',
      7: '#00cec9', 8: '#9090a8',
    };

    for (let r = 0; r < this.ROWS; r++) {
      for (let c = 0; c < this.COLS; c++) {
        const x = c * gs;
        const y = r * gs;

        if (this.visible[r][c]) {
          // 翻开的格子
          ctx.fillStyle = 'rgba(30, 30, 48, 0.3)';
          ctx.fillRect(x, y, gs, gs);

          if (this.board[r][c] === -1) {
            // 地雷
            const cx = x + gs / 2, cy = y + gs / 2;
            ctx.fillStyle = '#ff5f57';
            ctx.shadowColor = '#ff5f57';
            ctx.shadowBlur = 8;
            ctx.font = `${gs * 0.55}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('💣', cx, cy + 1);
            ctx.shadowBlur = 0;
          } else if (this.board[r][c] > 0) {
            // 数字
            ctx.fillStyle = NUM_COLORS[this.board[r][c]] || '#9090a8';
            ctx.font = `bold ${gs * 0.5}px "Inter", sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.board[r][c], x + gs / 2, y + gs / 2);
          }
        } else {
          // 未翻开的格子
          ctx.fillStyle = 'rgba(24, 24, 37, 0.8)';
          ctx.fillRect(x, y, gs, gs);

          // 3D 凸起效果
          ctx.strokeStyle = 'rgba(40, 40, 60, 0.4)';
          ctx.lineWidth = 1;
          ctx.strokeRect(x, y, gs, gs);

          ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
          ctx.fillRect(x, y, gs, gs);

          if (this.flags[r][c]) {
            const cx = x + gs / 2, cy = y + gs / 2;
            ctx.font = `${gs * 0.5}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fd79a8';
            ctx.fillText('🚩', cx, cy + 1);
          }
        }

        // 网格线
        ctx.strokeStyle = 'rgba(30, 30, 48, 0.15)';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x, y, gs, gs);
      }
    }

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

  // ========== 键盘绑定 ==========
  bindControls() {
    this._clickHandler = (e) => {
      const pos = this.getGridPos(e.clientX, e.clientY);
      if (!pos) return;
      if (e.button === 0) this.reveal(pos.row, pos.col);       // 左键
      if (e.button === 2) this.toggleFlag(pos.row, pos.col);   // 右键
    };

    this._contextHandler = (e) => { e.preventDefault(); };

    this._touchHandler = (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      const pos = this.getGridPos(touch.clientX, touch.clientY);
      if (!pos) return;
      this.reveal(pos.row, pos.col);
    };

    this._keyHandler = (e) => {
      if ((e.key === 'p' || e.key === 'P') && !this.isGameOver) {
        e.preventDefault();
        this.togglePause();
      }
    };

    this.canvas.addEventListener('click', this._clickHandler);
    this.canvas.addEventListener('contextmenu', this._contextHandler);
    this.canvas.addEventListener('touchstart', this._touchHandler);
    document.addEventListener('keydown', this._keyHandler);
  }

  unbindControls() {
    if (this._clickHandler) this.canvas.removeEventListener('click', this._clickHandler);
    if (this._contextHandler) this.canvas.removeEventListener('contextmenu', this._contextHandler);
    if (this._touchHandler) this.canvas.removeEventListener('touchstart', this._touchHandler);
    if (this._keyHandler) document.removeEventListener('keydown', this._keyHandler);
  }

  destroy() { this.stop(); this.unbindControls(); }
}

window.__GAMES = window.__GAMES || {};
window.__GAMES.minesweeper = MinesweeperGame;