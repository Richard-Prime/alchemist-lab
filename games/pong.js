/* ============================================
   乒乓球 · Game Module
   导出 PongGame 类，供 play-pong.html 使用
   人机对战，先得 5 分获胜
   ============================================ */

class PongGame {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.onScoreChange = options.onScoreChange || (() => {});
    this.onGameOver = options.onGameOver || (() => {});

    this.W = this.canvas.width;
    this.H = this.canvas.height;
    this.paddleW = 10;
    this.paddleH = 70;
    this.ballSize = 8;
    this.paddleSpeed = 5;
    this.aiSpeed = 4.2;
    this.winScore = 5;

    this.reset();
  }

  reset() {
    this.playerY = this.H / 2 - this.paddleH / 2;
    this.aiY = this.H / 2 - this.paddleH / 2;
    this.ballX = this.W / 2;
    this.ballY = this.H / 2;
    this.ballSpeedX = 4;
    this.ballSpeedY = 2;
    this.playerScore = 0;
    this.aiScore = 0;
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('pong_high') || '0');
    this.isRunning = false;
    this.isGameOver = false;
    this.isPaused = false;
    this.keys = { up: false, down: false };

    this.render();
  }

  // ========== 游戏循环 ==========
  start() {
    if (this.isRunning) return;
    if (this.isGameOver) this.reset();
    this.isRunning = true;
    this.isGameOver = false;
    this.isPaused = false;
    this.lastTime = performance.now();
    this.loop();
  }

  stop() {
    this.isRunning = false;
    if (this._rafId) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  pause() {
    this.isPaused = true;
    this.render();
  }

  resume() {
    if (!this.isPaused) return;
    this.isPaused = false;
    this.lastTime = performance.now();
    this.loop();
  }

  togglePause() {
    if (this.isPaused) this.resume();
    else this.pause();
  }

  destroy() {
    this.stop();
    this.unbindControls();
  }

  loop() {
    if (!this.isRunning || this.isPaused || this.isGameOver) return;
    const now = performance.now();
    const dt = Math.min(now - this.lastTime, 33); // 上限 ~30fps 防止大跳
    this.lastTime = now;
    this.update(dt);
    this.render();
    this._rafId = requestAnimationFrame(() => this.loop());
  }

  // ========== 更新逻辑 ==========
  update(dt) {
    const factor = dt / 16; // 归一化到 60fps

    // 玩家移动
    if (this.keys.up) this.playerY -= this.paddleSpeed * factor;
    if (this.keys.down) this.playerY += this.paddleSpeed * factor;
    this.playerY = Math.max(0, Math.min(this.H - this.paddleH, this.playerY));

    // AI 移动（跟踪球，有延迟）
    const aiCenter = this.aiY + this.paddleH / 2;
    const ballCenter = this.ballY;
    const diff = ballCenter - aiCenter;
    if (Math.abs(diff) > 10) {
      this.aiY += Math.sign(diff) * this.aiSpeed * factor;
    }
    this.aiY = Math.max(0, Math.min(this.H - this.paddleH, this.aiY));

    // 球移动
    this.ballX += this.ballSpeedX * factor;
    this.ballY += this.ballSpeedY * factor;

    // 上下边界反弹
    if (this.ballY - this.ballSize < 0) {
      this.ballY = this.ballSize;
      this.ballSpeedY = -this.ballSpeedY;
    }
    if (this.ballY + this.ballSize > this.H) {
      this.ballY = this.H - this.ballSize;
      this.ballSpeedY = -this.ballSpeedY;
    }

    // 玩家球拍碰撞
    if (this.ballX - this.ballSize < 20 + this.paddleW &&
        this.ballX - this.ballSize > 20 &&
        this.ballY > this.playerY &&
        this.ballY < this.playerY + this.paddleH) {
      this.ballX = 20 + this.paddleW + this.ballSize;
      this.ballSpeedX = -this.ballSpeedX;
      // 根据击中位置改变角度
      const hitPos = (this.ballY - (this.playerY + this.paddleH / 2)) / (this.paddleH / 2);
      this.ballSpeedY += hitPos * 1.5;
    }

    // AI 球拍碰撞
    if (this.ballX + this.ballSize > this.W - 20 - this.paddleW &&
        this.ballX + this.ballSize < this.W - 20 &&
        this.ballY > this.aiY &&
        this.ballY < this.aiY + this.paddleH) {
      this.ballX = this.W - 20 - this.paddleW - this.ballSize;
      this.ballSpeedX = -this.ballSpeedX;
      const hitPos = (this.ballY - (this.aiY + this.paddleH / 2)) / (this.paddleH / 2);
      this.ballSpeedY += hitPos * 1.5;
    }

    // 球速限制
    const maxSpeed = 8;
    this.ballSpeedX = Math.max(-maxSpeed, Math.min(maxSpeed, this.ballSpeedX));
    this.ballSpeedY = Math.max(-maxSpeed, Math.min(maxSpeed, this.ballSpeedY));

    // 球出界（得分）
    if (this.ballX < -20) {
      this.aiScore++;
      this.onScoreChange(this.playerScore);
      this.checkWin();
      this.resetBall();
    }
    if (this.ballX > this.W + 20) {
      this.playerScore++;
      this.score = this.playerScore;
      this.onScoreChange(this.playerScore);
      this.checkWin();
      this.resetBall();
    }
  }

  resetBall() {
    this.ballX = this.W / 2;
    this.ballY = this.H / 2;
    this.ballSpeedX = (Math.random() > 0.5 ? 1 : -1) * 4;
    this.ballSpeedY = (Math.random() - 0.5) * 3;
  }

  checkWin() {
    if (this.playerScore >= this.winScore || this.aiScore >= this.winScore) {
      const isWin = this.playerScore >= this.winScore;
      this.score = this.playerScore;
      this.isGameOver = true;
      this.isRunning = false;
      if (this.playerScore > this.highScore) {
        this.highScore = this.playerScore;
        localStorage.setItem('pong_high', String(this.highScore));
      }
      this.render();
      const msg = isWin ? '🎉 你赢了！先得 5 分！' : '💀 AI 先得 5 分，你输了！';
      this.onGameOver(msg, this.playerScore, this.highScore, isWin);
    }
  }

  // ========== 渲染 ==========
  render() {
    const ctx = this.ctx;
    ctx.fillStyle = '#0d0d14';
    ctx.fillRect(0, 0, this.W, this.H);

    // 中线
    ctx.strokeStyle = 'rgba(30, 30, 48, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(this.W / 2, 0);
    ctx.lineTo(this.W / 2, this.H);
    ctx.stroke();
    ctx.setLineDash([]);

    // 边界线
    ctx.strokeStyle = 'rgba(30, 30, 48, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(10, 10, this.W - 20, this.H - 20);

    // 玩家球拍（紫色）
    ctx.fillStyle = '#6c5ce7';
    ctx.shadowColor = '#6c5ce7';
    ctx.shadowBlur = 8;
    this.roundRect(ctx, 20, this.playerY, this.paddleW, this.paddleH, 4);
    ctx.fill();

    // AI 球拍（粉色）
    ctx.fillStyle = '#fd79a8';
    ctx.shadowColor = '#fd79a8';
    ctx.shadowBlur = 8;
    this.roundRect(ctx, this.W - 20 - this.paddleW, this.aiY, this.paddleW, this.paddleH, 4);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 球（青色）
    ctx.fillStyle = '#00cec9';
    ctx.shadowColor = '#00cec9';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(this.ballX, this.ballY, this.ballSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 比分
    ctx.fillStyle = 'rgba(144, 144, 168, 0.3)';
    ctx.font = 'bold 64px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.playerScore, this.W / 4, 50);
    ctx.fillText(this.aiScore, this.W * 3 / 4, 50);

    // 暂停
    if (this.isPaused && !this.isGameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, this.W, this.H);
      ctx.fillStyle = '#e8e8f0';
      ctx.font = '24px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⏸ 暂停中', this.W / 2, this.H / 2);
      ctx.font = '14px "Inter", sans-serif';
      ctx.fillStyle = '#9090a8';
      ctx.fillText('按 Space / P 继续', this.W / 2, this.H / 2 + 40);
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
      const key = e.key;
      if (key === 'ArrowUp') {
        e.preventDefault();
        this.keys.up = e.type === 'keydown';
      }
      if (key === 'ArrowDown') {
        e.preventDefault();
        this.keys.down = e.type === 'keydown';
      }
      if ((key === ' ' || key === 'p' || key === 'P') && e.type === 'keydown') {
        e.preventDefault();
        this.togglePause();
      }
    };
    document.addEventListener('keydown', this._keyHandler);
    document.addEventListener('keyup', this._keyHandler);
  }

  unbindControls() {
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
      document.removeEventListener('keyup', this._keyHandler);
    }
  }
}

window.__GAMES = window.__GAMES || {};
window.__GAMES.pong = PongGame;