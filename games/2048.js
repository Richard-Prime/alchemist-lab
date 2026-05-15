/* ============================================
   2048 · Game Module
   合并相同数字方块，挑战到达 2048！
   使用 Canvas 渲染，键盘 + 触屏支持
   带方块滑动/合并动画
   ============================================ */

class Game2048 {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.onScoreChange = options.onScoreChange || (() => {});
    this.onGameOver = options.onGameOver || (() => {});

    this.grid = [];
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('2048_high') || '0');
    this.isRunning = false;
    this.isGameOver = false;
    this.isPaused = false;
    this.isWin = false;
    this.hasWon = false;
    this.tileSize = 0;
    this.padding = 6;

    // 动画状态
    this.animating = false;
    this.animTiles = [];       // 正在运动中的方块
    this.animMergeTiles = [];  // 正在合并消失的方块
    this.animNewTiles = [];    // 新诞生的方块
    this.animStartTime = 0;
    this.animDuration = 300;   // 毫秒

    this.TILE_COLORS = {
      2:     { bg: '#eee4da', text: '#776e65' },
      4:     { bg: '#ede0c8', text: '#776e65' },
      8:     { bg: '#f2b179', text: '#f9f6f2' },
      16:    { bg: '#f59563', text: '#f9f6f2' },
      32:    { bg: '#f67c5f', text: '#f9f6f2' },
      64:    { bg: '#f65e3b', text: '#f9f6f2' },
      128:   { bg: '#edcf72', text: '#f9f6f2' },
      256:   { bg: '#edcc61', text: '#f9f6f2' },
      512:   { bg: '#edc850', text: '#f9f6f2' },
      1024:  { bg: '#edc53f', text: '#f9f6f2' },
      2048:  { bg: '#edc22e', text: '#f9f6f2' },
      4096:  { bg: '#3c3a32', text: '#f9f6f2' },
      8192:  { bg: '#3c3a32', text: '#f9f6f2' },
    };
    this.DEFAULT_COLOR = { bg: '#3c3a32', text: '#f9f6f2' };

    this.reset();
  }

  reset() {
    this.grid = Array.from({ length: 4 }, () => Array(4).fill(0));
    this.score = 0;
    this.isGameOver = false;
    this.isWin = false;
    this.hasWon = false;
    this.animating = false;
    this.addRandomTile();
    this.addRandomTile();
    this.tileSize = (this.canvas.width - this.padding * 5) / 4;
    this.render();
  }

  // ========== Tile 坐标工具 ==========
  tileX(c) { return this.padding + c * (this.tileSize + this.padding); }
  tileY(r) { return this.padding + r * (this.tileSize + this.padding); }

  // ========== 随机新方块 ==========
  addRandomTile() {
    const empty = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (this.grid[r][c] === 0) empty.push({ r, c });
      }
    }
    if (empty.length === 0) return;
    const { r, c } = empty[Math.floor(Math.random() * empty.length)];
    this.grid[r][c] = Math.random() < 0.9 ? 2 : 4;
  }

  // ========== 滑动 + 合并（同时记录动画数据） ==========
  slideLeft() {
    let moved = false;
    const anims = [];   // { fromR, fromC, toR, toC, val, merged }
    const merges = [];  // { r, c, val }

    for (let r = 0; r < 4; r++) {
      // 记录每格的位置
      const positions = [];
      for (let c = 0; c < 4; c++) {
        if (this.grid[r][c] !== 0) {
          positions.push({ c, val: this.grid[r][c] });
        }
      }

      // 合并逻辑并记录动画
      const result = [];
      let used = false;
      for (let i = 0; i < positions.length; i++) {
        if (used) { used = false; continue; }
        if (i + 1 < positions.length && positions[i].val === positions[i + 1].val) {
          const newVal = positions[i].val * 2;
          // 移动动画：两个方块都移到目标位置
          anims.push({ fromR: r, fromC: positions[i].c, toR: r, toC: result.length, val: positions[i].val });
          anims.push({ fromR: r, fromC: positions[i + 1].c, toR: r, toC: result.length, val: positions[i + 1].val });
          merges.push({ r, c: result.length, val: newVal });
          result.push(newVal);
          this.score += newVal;
          this.onScoreChange(this.score);
          if (newVal === 2048) this.isWin = true;
          used = true;
        } else {
          anims.push({ fromR: r, fromC: positions[i].c, toR: r, toC: result.length, val: positions[i].val });
          result.push(positions[i].val);
        }
      }

      // 补零并检测变化
      while (result.length < 4) result.push(0);
      if (this.grid[r].join(',') !== result.join(',')) moved = true;
      this.grid[r] = result;
    }

    return { moved, anims, merges };
  }

  // 矩阵转置
  transpose() {
    const newGrid = Array.from({ length: 4 }, () => Array(4).fill(0));
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        newGrid[c][r] = this.grid[r][c];
      }
    }
    this.grid = newGrid;
  }

  // 每行反转
  reverseRows() {
    for (let r = 0; r < 4; r++) this.grid[r].reverse();
  }

  // 带动画的移动入口
  move(direction) {
    if (!this.isRunning || this.isGameOver || this.isPaused || this.animating) return false;

    let result;

    // 通过矩阵变换，统一用 slideLeft
    switch (direction) {
      case 'left':
        result = this.slideLeft();
        break;
      case 'right':
        this.reverseRows();
        result = this.slideLeft();
        this.reverseRows();
        break;
      case 'up':
        this.transpose();
        result = this.slideLeft();
        this.transpose();
        break;
      case 'down':
        this.transpose();
        this.reverseRows();
        result = this.slideLeft();
        this.reverseRows();
        this.transpose();
        break;
    }

    if (!result || !result.moved) return false;

    // 修正矩阵变换后的动画坐标
    this.fixAnimCoords(result, direction);

    // 启动动画
    this.playAnimation(result);

    return true;
  }

  // 修正其他方向的动画坐标（因为 slideLeft 总是记录左移，需反向转换）
  fixAnimCoords(result, dir) {
    if (dir === 'left') return;
    for (const a of result.anims) {
      const fr = a.fromR, fc = a.fromC, tr = a.toR, tc = a.toC;
      let nfr, nfc, ntr, ntc;
      switch (dir) {
        case 'right': nfr = fr; nfc = 3 - fc; ntr = tr; ntc = 3 - tc; break;
        case 'up':    nfr = fc; nfc = fr; ntr = tc; ntc = tr; break;
        case 'down':  nfr = 3 - fc; nfc = fr; ntr = 3 - tc; ntc = tr; break;
        default: nfr = fr; nfc = fc; ntr = tr; ntc = tc;
      }
      a.fromR = nfr; a.fromC = nfc; a.toR = ntr; a.toC = ntc;
    }
    for (const m of result.merges) {
      const r = m.r, c = m.c;
      switch (dir) {
        case 'right': m.r = r; m.c = 3 - c; break;
        case 'up':    m.r = c; m.c = r; break;
        case 'down':  m.r = 3 - c; m.c = r; break;
      }
    }
  }

  // ========== 播放动画 ==========
  playAnimation(result) {
    this.animating = true;
    this.animTiles = result.anims;
    this.animMergeTiles = result.merges;
    this.animNewTiles = [];
    this.animStartTime = performance.now();

    const animate = (now) => {
      const elapsed = now - this.animStartTime;
      const progress = Math.min(elapsed / this.animDuration, 1);
      // easeOutQuad 缓动
      const eased = 1 - (1 - progress) * (1 - progress);

      // 清除动画合并标记：如果 progress 接近 1，把合并到的目标格的值更新
      this.renderAnim(eased);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // 动画结束
        this.animating = false;
        this.animTiles = [];
        this.animMergeTiles = [];

        // 添加新方块并刷新
        this.addRandomTile();
        this.render();

        if (this.isWin && !this.hasWon) this.hasWon = true;
        if (this.isGameOverCheck()) {
          this.gameOver('棋盘已满，无法继续合并！');
        }
      }
    };

    requestAnimationFrame(animate);
  }

  // ========== 动画渲染 ==========
  renderAnim(progress) {
    const ctx = this.ctx;
    const size = this.canvas.width;
    const gs = this.tileSize;
    const pad = this.padding;

    // 清空全画布
    ctx.fillStyle = '#0d0d14';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(30, 30, 48, 0.3)';
    ctx.fillRect(0, 0, size, size);

    // 画出静止的空格子
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const x = this.tileX(c);
        const y = this.tileY(r);
        ctx.fillStyle = 'rgba(30, 30, 48, 0.4)';
        this.roundRect(ctx, x, y, gs, gs, 6);
        ctx.fill();
      }
    }

    // 画出不动的格子（没有被动画覆盖的目标格排除）
    const movingFrom = new Set();
    const movingTo = new Set();
    for (const a of this.animTiles) {
      movingFrom.add(`${a.fromR},${a.fromC}`);
      movingTo.add(`${a.toR},${a.toC}`);
    }

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (this.grid[r][c] === 0) continue;
        // 如果在动画的起始格或目标格，不画（由动画绘制）
        if (movingFrom.has(`${r},${c}`)) continue;
        if (movingTo.has(`${r},${c}`)) continue;
        this.drawTile(ctx, r, c, this.grid[r][c], 1);
      }
    }

    // 绘制动画中的滑动方块
    for (const a of this.animTiles) {
      const fromX = this.tileX(a.fromC);
      const fromY = this.tileY(a.fromR);
      const toX = this.tileX(a.toC);
      const toY = this.tileY(a.toR);
      const x = fromX + (toX - fromX) * progress;
      const y = fromY + (toY - fromY) * progress;
      this.drawTileAt(ctx, x, y, a.val, 1);
    }

    // 合并闪光效果：进度 >70% 时完整重绘合并后的方块
    for (const m of this.animMergeTiles) {
      if (progress > 0.7) {
        const flash = (progress - 0.7) / 0.3;
        const tx = this.tileX(m.c);
        const ty = this.tileY(m.r);
        const colors = this.TILE_COLORS[m.val] || this.DEFAULT_COLOR;

        // 完整绘制合并后的新值方块（覆盖两个旧方块留下的残留）
        ctx.fillStyle = colors.bg;
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = flash * 18;
        this.roundRect(ctx, tx, ty, gs, gs, 6);
        ctx.fill();
        ctx.shadowBlur = 0;

        // 数字
        const fontSize = m.val >= 1000 ? 24 : m.val >= 100 ? 28 : 32;
        ctx.fillStyle = colors.text;
        ctx.font = `bold ${fontSize}px "Inter", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(String(m.val), tx + gs / 2, ty + gs / 2);
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

  // ========== 绘制单个方块 ==========
  drawTile(ctx, r, c, val, alpha) {
    this.drawTileAt(ctx, this.tileX(c), this.tileY(r), val, alpha);
  }

  drawTileAt(ctx, x, y, val, alpha) {
    const gs = this.tileSize;
    const colors = this.TILE_COLORS[val] || this.DEFAULT_COLOR;

    ctx.globalAlpha = Math.min(alpha, 1);
    ctx.fillStyle = colors.bg;
    ctx.shadowColor = colors.bg;
    ctx.shadowBlur = 4;
    this.roundRect(ctx, x, y, gs, gs, 6);
    ctx.fill();
    ctx.shadowBlur = 0;

    const text = String(val);
    const fontSize = val >= 1000 ? 24 : val >= 100 ? 28 : 32;
    ctx.fillStyle = colors.text;
    ctx.font = `bold ${fontSize}px "Inter", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + gs / 2, y + gs / 2);
    ctx.globalAlpha = 1;
  }

  // ========== 标准渲染（无动画） ==========
  render() {
    const ctx = this.ctx;
    const size = this.canvas.width;
    const gs = this.tileSize;
    const pad = this.padding;

    ctx.fillStyle = '#0d0d14';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(30, 30, 48, 0.3)';
    ctx.fillRect(0, 0, size, size);

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const x = this.tileX(c);
        const y = this.tileY(r);
        ctx.fillStyle = 'rgba(30, 30, 48, 0.4)';
        this.roundRect(ctx, x, y, gs, gs, 6);
        ctx.fill();
      }
    }

    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (this.grid[r][c] === 0) continue;
        this.drawTile(ctx, r, c, this.grid[r][c], 1);
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
    if (this.animating) return;
    if (this.isPaused) this.resume();
    else this.pause();
  }

  destroy() { this.unbindControls(); }

  gameOver(message) {
    this.isGameOver = true;
    this.isRunning = false;
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('2048_high', String(this.highScore));
    }
    this.render();
    this.onGameOver(message, this.score, this.highScore, this.isWin);
  }

  isGameOverCheck() {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (this.grid[r][c] === 0) return false;
      }
    }
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const val = this.grid[r][c];
        if (c + 1 < 4 && this.grid[r][c + 1] === val) return false;
        if (r + 1 < 4 && this.grid[r + 1][c] === val) return false;
      }
    }
    return true;
  }

  // ========== 键盘绑定 ==========
  bindControls() {
    this._keyHandler = (e) => {
      if (!this.isRunning || this.isGameOver || this.isPaused) return;
      switch (e.key) {
        case 'ArrowLeft': case 'a': case 'A': e.preventDefault(); this.move('left'); break;
        case 'ArrowRight': case 'd': case 'D': e.preventDefault(); this.move('right'); break;
        case 'ArrowUp': case 'w': case 'W': e.preventDefault(); this.move('up'); break;
        case 'ArrowDown': case 's': case 'S': e.preventDefault(); this.move('down'); break;
        case 'p': case 'P': e.preventDefault(); this.togglePause(); break;
      }
    };

    this._touchStartX = 0;
    this._touchStartY = 0;
    this._touchStartHandler = (e) => {
      if (!this.isRunning || this.isGameOver || this.isPaused) return;
      const touch = e.touches[0];
      this._touchStartX = touch.clientX;
      this._touchStartY = touch.clientY;
    };
    this._touchEndHandler = (e) => {
      if (!this.isRunning || this.isGameOver || this.isPaused || this.animating) return;
      const touch = e.changedTouches[0];
      const dx = touch.clientX - this._touchStartX;
      const dy = touch.clientY - this._touchStartY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      if (Math.max(absDx, absDy) < 30) return;
      if (absDx > absDy) {
        e.preventDefault();
        this.move(dx > 0 ? 'right' : 'left');
      } else {
        e.preventDefault();
        this.move(dy > 0 ? 'down' : 'up');
      }
    };

    document.addEventListener('keydown', this._keyHandler);
    this.canvas.addEventListener('touchstart', this._touchStartHandler);
    this.canvas.addEventListener('touchend', this._touchEndHandler);
  }

  unbindControls() {
    if (this._keyHandler) document.removeEventListener('keydown', this._keyHandler);
    if (this._touchStartHandler) this.canvas.removeEventListener('touchstart', this._touchStartHandler);
    if (this._touchEndHandler) this.canvas.removeEventListener('touchend', this._touchEndHandler);
  }

  destroy() { this.stop(); this.unbindControls(); }
}

window.__GAMES = window.__GAMES || {};
window.__GAMES['2048'] = Game2048;