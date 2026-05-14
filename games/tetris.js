/* ============================================
   俄罗斯方块 · Game Module
   导出 TetrisGame 类，供 play.html 加载使用
   ============================================ */

class TetrisGame {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.onScoreChange = options.onScoreChange || (() => {});
    this.onGameOver = options.onGameOver || (() => {});

    // 游戏配置
    this.cols = 10;
    this.rows = 20;
    this.gridSize = 32;
    this.baseInterval = 500; // 初始下落间隔 (ms)
    this.tickTimer = null;

    // 预览画布（显示下一个方块）
    this.previewCanvas = document.getElementById('previewCanvas');
    this.previewCtx = this.previewCanvas ? this.previewCanvas.getContext('2d') : null;

    // 七种标准方块
    this.TETROMINOES = {
      I: { shape: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], color: '#00cec9' },
      O: { shape: [[1,1],[1,1]], color: '#ffbd2e' },
      T: { shape: [[0,1,0],[1,1,1],[0,0,0]], color: '#6c5ce7' },
      S: { shape: [[0,1,1],[1,1,0],[0,0,0]], color: '#28c840' },
      Z: { shape: [[1,1,0],[0,1,1],[0,0,0]], color: '#ff5f57' },
      J: { shape: [[1,0,0],[1,1,1],[0,0,0]], color: '#fd79a8' },
      L: { shape: [[0,0,1],[1,1,1],[0,0,0]], color: '#ff9f43' },
    };

    this.reset();
  }

  reset() {
    // 初始化空棋盘
    this.board = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));

    // 当前方块
    this.currentPiece = null;   // { type, shape, x, y }
    this.nextPiece = null;
    this.score = 0;
    this.level = 1;
    this.lines = 0;
    this.highScore = parseInt(localStorage.getItem('tetris_high') || '0');
    this.isRunning = false;
    this.isGameOver = false;
    this.isPaused = false;

    // 消除动画状态
    this.clearingRows = [];       // 正在消除的行索引
    this.clearingFrame = 0;       // 消除动画帧
    this.clearingTimer = null;    // 消除动画定时器
    this.pendingClears = 0;       // 待消除行数（用于计分）

    // 生成第一个方块
    this.nextPiece = this.randomPiece();
    this.spawnPiece();
  }

  // ========== 方块生成 ==========
  randomType() {
    const types = Object.keys(this.TETROMINOES);
    return types[Math.floor(Math.random() * types.length)];
  }

  randomPiece() {
    const type = this.randomType();
    const shape = this.TETROMINOES[type].shape.map(row => [...row]);
    return { type, shape };
  }

  spawnPiece() {
    if (!this.nextPiece) {
      this.nextPiece = this.randomPiece();
    }
    this.currentPiece = {
      type: this.nextPiece.type,
      shape: this.nextPiece.shape.map(row => [...row]),
      x: Math.floor((this.cols - this.nextPiece.shape[0].length) / 2),
      y: 0,
    };
    this.nextPiece = this.randomPiece();

    // 生成时立即检测碰撞 = 游戏结束
    if (this.collides(this.currentPiece.shape, this.currentPiece.x, this.currentPiece.y)) {
      this.gameOver('方块堆到顶了！🧱');
    }
  }

  // ========== 碰撞检测 ==========
  collides(shape, offsetX, offsetY) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const boardX = offsetX + c;
          const boardY = offsetY + r;
          // 超出左右下边界 或 与已固定方块重叠
          if (boardX < 0 || boardX >= this.cols || boardY >= this.rows) return true;
          // 允许方块在上方（y < 0）存在
          if (boardY >= 0 && this.board[boardY][boardX]) return true;
        }
      }
    }
    return false;
  }

  // ========== 方块旋转（顺时针） ==========
  rotateShape(shape) {
    const n = shape.length;
    const rotated = Array.from({ length: n }, () => Array(n).fill(0));
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        rotated[c][n - 1 - r] = shape[r][c];
      }
    }
    return rotated;
  }

  rotate() {
    if (!this.currentPiece || this.isPaused || this.isGameOver) return;
    const rotated = this.rotateShape(this.currentPiece.shape);
    // 墙踢（Wall Kick）：尝试左右偏移
    const kicks = [0, -1, 1, -2, 2];
    for (const kick of kicks) {
      if (!this.collides(rotated, this.currentPiece.x + kick, this.currentPiece.y)) {
        this.currentPiece.shape = rotated;
        this.currentPiece.x += kick;
        this.render();
        return;
      }
    }
  }

  // ========== 方块移动 ==========
  move(dx, dy) {
    if (!this.currentPiece || this.isPaused || this.isGameOver) return false;
    if (!this.collides(this.currentPiece.shape, this.currentPiece.x + dx, this.currentPiece.y + dy)) {
      this.currentPiece.x += dx;
      this.currentPiece.y += dy;
      this.render();
      return true;
    }
    // 如果是向下移动失败（dy === 1），立即固定
    if (dy === 1) {
      this.lockPiece();
    }
    return false;
  }

  moveLeft() { this.move(-1, 0); }
  moveRight() { this.move(1, 0); }

  // ========== 硬降 ==========
  hardDrop() {
    if (!this.currentPiece || this.isPaused || this.isGameOver) return;
    let dropDistance = 0;
    while (!this.collides(this.currentPiece.shape, this.currentPiece.x, this.currentPiece.y + 1)) {
      this.currentPiece.y++;
      dropDistance++;
    }
    this.score += dropDistance * 2;
    this.onScoreChange(this.score);
    this.lockPiece();
  }

  // ========== 固定方块 ==========
  lockPiece() {
    if (!this.currentPiece) return;
    const { shape, x, y } = this.currentPiece;

    // 将当前方块写入棋盘
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          const boardX = x + c;
          const boardY = y + r;
          if (boardY < 0) {
            this.gameOver('方块堆到顶了！🧱');
            return;
          }
          this.board[boardY][boardX] = this.currentPiece.type;
        }
      }
    }

    // 消行检测
    this.clearLines();

    // 如果没有消除动画，继续生成下一个方块
    if (this.clearingRows.length === 0) {
      this.spawnPiece();
      this.render();
      this.renderPreview();
    }
  }

  // ========== 消行（带消除动画） ==========
  clearLines() {
    // 找出需要消除的行
    const toClear = [];
    for (let r = this.rows - 1; r >= 0; r--) {
      if (this.board[r].every(cell => cell !== null)) {
        toClear.push(r);
      }
    }

    if (toClear.length === 0) return;

    this.pendingClears = toClear.length;
    this.clearingRows = toClear;
    this.clearingFrame = 0;

    // 暂停下落循环，播放消除动画
    if (this.tickTimer) {
      clearTimeout(this.tickTimer);
      this.tickTimer = null;
    }

    // 用 requestAnimationFrame 驱动消除动画（约12帧 = 200ms）
    this.animateClear();
  }

  animateClear() {
    this.clearingFrame = 0;
    this.clearingRowsVisible = true;
    // 清空当前方块引用（已被写入棋盘，闪烁时不再绘制）
    this.currentPiece = null;
    this.flashCycle();
  }

  flashCycle() {
    this.clearingFrame++;

    // 切换可见性：亮 → 暗 → 亮 → 暗 ...
    this.clearingRowsVisible = this.clearingFrame % 2 === 1;
    this.render();

    if (this.clearingFrame < 8) {
      // 4次闪烁 = 8次切换，每次~160ms，总时长~1.3s
      this.clearingTimer = setTimeout(() => this.flashCycle(), 100);
    } else {
      // 动画结束，最终亮一次后消除
      this.clearingRowsVisible = true;
      this.render();
      setTimeout(() => this.finishClear(), 80);
    }
  }

  finishClear() {
    const cleared = this.pendingClears;

    // 按从下到上的顺序消除
    const sorted = [...this.clearingRows].sort((a, b) => b - a);
    for (const r of sorted) {
      this.board.splice(r, 1);
      this.board.unshift(Array(this.cols).fill(null));
    }

    this.clearingRows = [];
    this.clearingFrame = 0;
    this.pendingClears = 0;

    // 计分
    this.lines += cleared;
    const lineScores = [0, 10, 30, 60, 100];
    this.score += (lineScores[cleared] || 100) * this.level;
    this.onScoreChange(this.score);

    // 每清除 10 行升一级
    const newLevel = Math.floor(this.lines / 10) + 1;
    if (newLevel > this.level) {
      this.level = newLevel;
      this.baseInterval = Math.max(100, 500 - (this.level - 1) * 40);
    }

    // 递归检查是否有新的满行产生（消除后上方方块下落可能形成）
    this.clearLines();

    // 如果没有消除动画，继续流程
    if (this.clearingRows.length === 0) {
      this.spawnPiece();
      this.render();
      this.renderPreview();

      // 恢复下落循环
      if (this.isRunning && !this.isPaused && !this.isGameOver) {
        this.tickTimer = setTimeout(() => this.tick(), this.baseInterval);
      }
    }
  }

  // ========== 游戏循环 ==========
  start() {
    if (this.isRunning) return;
    // 如果 Game Over 则重置
    if (this.isGameOver) {
      this.reset();
    }
    this.isRunning = true;
    this.isGameOver = false;
    this.isPaused = false;
    this.render();
    this.renderPreview();
    this.tick();
  }

  stop() {
    this.isRunning = false;
    if (this.tickTimer) {
      clearTimeout(this.tickTimer);
      this.tickTimer = null;
    }
  }

  pause() {
    this.isPaused = true;
    if (this.tickTimer) {
      clearTimeout(this.tickTimer);
      this.tickTimer = null;
    }
    this.render();
  }

  resume() {
    if (!this.isPaused || !this.isRunning) return;
    this.isPaused = false;
    this.render();
    this.tick();
  }

  togglePause() {
    if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  tick() {
    if (!this.isRunning || this.isPaused || this.isGameOver) return;

    // 尝试下落
    if (!this.move(0, 1)) {
      // move 内部已调用 lockPiece
    }

    if (!this.isGameOver && this.isRunning) {
      this.tickTimer = setTimeout(() => this.tick(), this.baseInterval);
    }
  }

  gameOver(message, isWin = false) {
    this.isGameOver = true;
    this.isRunning = false;
    if (this.tickTimer) {
      clearTimeout(this.tickTimer);
      this.tickTimer = null;
    }

    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('tetris_high', String(this.highScore));
    }

    this.render();
    this.onGameOver(message, this.score, this.highScore, isWin);
  }

  // ========== 渲染 ==========
  render() {
    const ctx = this.ctx;
    const gs = this.gridSize;
    const canvasW = this.canvas.width;
    const canvasH = this.canvas.height;

    // 清空画布
    ctx.fillStyle = '#0d0d14';
    ctx.fillRect(0, 0, canvasW, canvasH);

    // 绘制网格
    ctx.strokeStyle = 'rgba(30, 30, 48, 0.3)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= this.cols; x++) {
      ctx.beginPath();
      ctx.moveTo(x * gs, 0);
      ctx.lineTo(x * gs, canvasH);
      ctx.stroke();
    }
    for (let y = 0; y <= this.rows; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * gs);
      ctx.lineTo(canvasW, y * gs);
      ctx.stroke();
    }

    // 绘制已固定的方块（排除正在消除的行）
    const clearingSet = new Set(this.clearingRows);
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        if (this.board[r][c] && !clearingSet.has(r)) {
          this.drawBlock(ctx, c * gs, r * gs, this.board[r][c], gs);
        }
      }
    }

    // 消除动画：闪烁（亮/暗切换）
    if (this.clearingRows.length > 0 && this.clearingRowsVisible) {
      for (const r of this.clearingRows) {
        // 全行白色覆盖
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(0, r * gs, canvasW, gs);

        // 行内方块白色高亮
        for (let c = 0; c < this.cols; c++) {
          if (this.board[r][c]) {
            ctx.fillStyle = '#fff';
            ctx.shadowColor = '#fff';
            ctx.shadowBlur = 16;
            this.roundRect(ctx, c * gs + 2, r * gs + 2, gs - 4, gs - 4, 4);
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        }

        // 行边界青色闪光
        ctx.strokeStyle = '#00cec9';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, r * gs);
        ctx.lineTo(canvasW, r * gs);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, (r + 1) * gs);
        ctx.lineTo(canvasW, (r + 1) * gs);
        ctx.stroke();
      }
    }

    // 绘制当前方块
    if (this.currentPiece && !this.isGameOver) {
      const { shape, x, y } = this.currentPiece;
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c]) {
            const blockX = (x + c) * gs;
            const blockY = (y + r) * gs;
            if (y + r >= 0) {
              this.drawBlock(ctx, blockX, blockY, this.currentPiece.type, gs);
            }
          }
        }
      }
    }

    // 暂停遮罩
    if (this.isPaused && !this.isGameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, canvasW, canvasH);
      ctx.fillStyle = '#e8e8f0';
      ctx.font = '24px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⏸ 暂停中', canvasW / 2, canvasH / 2);
      ctx.font = '14px "Inter", sans-serif';
      ctx.fillStyle = '#9090a8';
      ctx.fillText('按 Space / P 继续', canvasW / 2, canvasH / 2 + 40);
    }
  }

  drawBlock(ctx, x, y, type, gs) {
    const color = this.TETROMINOES[type]?.color || '#6c5ce7';
    const padding = 1;
    const radius = 4;

    // 主体
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;
    this.roundRect(ctx, x + padding, y + padding, gs - padding * 2, gs - padding * 2, radius);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 高光（左上角亮边）
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
    this.roundRect(ctx, x + padding + 2, y + padding + 2, gs * 0.35, gs * 0.2, 2);
    ctx.fill();

    // 阴影（右下角暗边）
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    this.roundRect(ctx, x + gs - padding - gs * 0.3, y + gs - padding - gs * 0.15, gs * 0.25, gs * 0.1, 1);
    ctx.fill();
  }

  renderPreview() {
    if (!this.previewCtx || !this.nextPiece) return;
    const ctx = this.previewCtx;
    const canvas = this.previewCanvas;
    const gs = 24; // 预览格子大小

    ctx.fillStyle = '#0d0d14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const shape = this.nextPiece.shape;
    const rows = shape.length;
    const cols = shape[0].length;
    const offsetX = (canvas.width - cols * gs) / 2;
    const offsetY = (canvas.height - rows * gs) / 2;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (shape[r][c]) {
          const color = this.TETROMINOES[this.nextPiece.type]?.color || '#6c5ce7';
          const x = offsetX + c * gs;
          const y = offsetY + r * gs;
          ctx.fillStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 4;
          this.roundRect(ctx, x + 1, y + 1, gs - 2, gs - 2, 3);
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    }
  }

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // ========== 键盘绑定 ==========
  bindControls() {
    this._keyHandler = (e) => {
      if (!this.isRunning || this.isGameOver) return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          this.moveLeft();
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          this.moveRight();
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          this.move(0, 1);
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          this.rotate();
          break;
        case ' ':
          e.preventDefault();
          this.hardDrop();
          break;
        case 'p':
        case 'P':
          e.preventDefault();
          this.togglePause();
          break;
      }
    };
    document.addEventListener('keydown', this._keyHandler);
  }

  unbindControls() {
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
    }
  }

  // ========== 销毁 ==========
  destroy() {
    this.stop();
    if (this.clearingTimer) {
      clearTimeout(this.clearingTimer);
      this.clearingTimer = null;
    }
    this.unbindControls();
  }
}

// 注册到全局游戏注册表
window.__GAMES = window.__GAMES || {};
window.__GAMES.tetris = TetrisGame;
