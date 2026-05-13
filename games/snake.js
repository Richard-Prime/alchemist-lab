/* ============================================
   贪吃蛇 · Game Module
   导出 SnakeGame 类，供 play.html 加载使用
   ============================================ */

class SnakeGame {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.onScoreChange = options.onScoreChange || (() => {});
    this.onGameOver = options.onGameOver || (() => {});

    // 游戏配置
    this.gridSize = 20;        // 格子大小 (px)
    this.tickInterval = 150;   // 初始速度 (ms)
    this.tickTimer = null;
    this.animationId = null;

    // 游戏状态
    this.reset();
  }

  reset() {
    // 计算网格行列数
    this.cols = Math.floor(this.canvas.width / this.gridSize);
    this.rows = Math.floor(this.canvas.height / this.gridSize);

    // 蛇：初始长度为3，位于中间区域
    const startX = Math.floor(this.cols / 2);
    const startY = Math.floor(this.rows / 2);
    this.snake = [
      { x: startX, y: startY },
      { x: startX - 1, y: startY },
      { x: startX - 2, y: startY },
    ];

    this.direction = { x: 1, y: 0 };     // 当前方向
    this.nextDirection = { x: 1, y: 0 };  // 下一帧方向（缓冲区）
    this.food = this.spawnFood();
    this.score = 0;
    this.highScore = parseInt(localStorage.getItem('snake_high') || '0');
    this.isRunning = false;
    this.isGameOver = false;
    this.isPaused = false;
  }

  // ========== 食物生成 ==========
  spawnFood() {
    const available = [];
    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        if (!this.snake.some(seg => seg.x === x && seg.y === y)) {
          available.push({ x, y });
        }
      }
    }
    if (available.length === 0) return null; // 胜利：蛇填满了整个画面
    return available[Math.floor(Math.random() * available.length)];
  }

  // ========== 方向控制 ==========
  setDirection(dx, dy) {
    // 不允许原地掉头
    if (this.direction.x === -dx && this.direction.y === -dy) return;
    // 不允许与当前方向相同
    if (this.direction.x === dx && this.direction.y === dy) return;
    this.nextDirection = { x: dx, y: dy };
  }

  // ========== 游戏循环 ==========
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.isGameOver = false;
    this.isPaused = false;
    this.tick();
  }

  stop() {
    this.isRunning = false;
    if (this.tickTimer) {
      clearTimeout(this.tickTimer);
      this.tickTimer = null;
    }
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  pause() {
    this.isPaused = true;
    if (this.tickTimer) {
      clearTimeout(this.tickTimer);
      this.tickTimer = null;
    }
  }

  resume() {
    if (!this.isPaused || !this.isRunning) return;
    this.isPaused = false;
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

    // 应用缓冲方向
    this.direction = { ...this.nextDirection };

    // 计算新蛇头位置
    const head = this.snake[0];
    const newHead = {
      x: head.x + this.direction.x,
      y: head.y + this.direction.y,
    };

    // 检测是否吃到食物
    const ate = this.food && newHead.x === this.food.x && newHead.y === this.food.y;

    // 构建新蛇
    let newSnake = [newHead, ...this.snake];
    if (!ate) {
      newSnake.pop(); // 没吃到就去掉尾巴
    }

    // ========== 碰撞检测 ==========
    // 1. 撞墙
    if (newHead.x < 0 || newHead.x >= this.cols || newHead.y < 0 || newHead.y >= this.rows) {
      this.gameOver('撞墙啦！💥');
      return;
    }
    // 2. 撞自己（新蛇头不能与后面的身体重合）
    //    注意：如果吃到了，新蛇头可能在旧蛇头位置？不会，因为新蛇头是新坐标
    //    但如果吃到了，蛇会变长，检查新蛇头是否与除去尾部后的身体重叠
    const bodyToCheck = ate ? newSnake : newSnake.slice(0, -1);
    const headCollision = bodyToCheck.slice(1).some(seg => seg.x === newHead.x && seg.y === newHead.y);
    if (headCollision) {
      this.gameOver('咬到自己了！😵');
      return;
    }

    // 更新蛇
    this.snake = newSnake;

    // 处理食物
    if (ate) {
      this.score += 10;
      this.onScoreChange(this.score);

      // 胜利检测：蛇填满整个画面
      this.food = this.spawnFood();
      if (!this.food) {
        this.gameOver('🎉 你赢了！完美通关！', true);
        return;
      }

      // 每吃5个食物加速一次（上限提升速度）
      if (this.score % 50 === 0 && this.tickInterval > 60) {
        this.tickInterval -= 10;
      }
    }

    // 渲染
    this.render();

    // 下一帧
    this.tickTimer = setTimeout(() => this.tick(), this.tickInterval);
  }

  gameOver(message, isWin = false) {
    this.isGameOver = true;
    this.isRunning = false;
    if (this.tickTimer) {
      clearTimeout(this.tickTimer);
      this.tickTimer = null;
    }

    // 更新最高分
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem('snake_high', String(this.highScore));
    }

    this.render(); // 最后一帧渲染
    this.onGameOver(message, this.score, this.highScore, isWin);
  }

  // ========== 渲染 ==========
  render() {
    const ctx = this.ctx;
    const gs = this.gridSize;

    // 清空画布
    ctx.fillStyle = '#0d0d14';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 绘制网格（细线）
    ctx.strokeStyle = 'rgba(30, 30, 48, 0.3)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= this.cols; x++) {
      ctx.beginPath();
      ctx.moveTo(x * gs, 0);
      ctx.lineTo(x * gs, this.canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= this.rows; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * gs);
      ctx.lineTo(this.canvas.width, y * gs);
      ctx.stroke();
    }

    // 绘制食物（发光效果）
    if (this.food) {
      const fx = this.food.x * gs + gs / 2;
      const fy = this.food.y * gs + gs / 2;
      const gradient = ctx.createRadialGradient(fx, fy, 0, fx, fy, gs);
      gradient.addColorStop(0, 'rgba(253, 121, 168, 1)');
      gradient.addColorStop(0.5, 'rgba(253, 121, 168, 0.8)');
      gradient.addColorStop(1, 'rgba(253, 121, 168, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(this.food.x * gs - gs / 2, this.food.y * gs - gs / 2, gs * 2, gs * 2);

      // 食物主体
      ctx.fillStyle = '#fd79a8';
      ctx.shadowColor = '#fd79a8';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(fx, fy, gs / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // 绘制蛇
    this.snake.forEach((seg, index) => {
      const x = seg.x * gs;
      const y = seg.y * gs;
      const padding = 1;
      const radius = 4;

      // 蛇身渐变：从蛇头紫色渐变到蛇尾青色
      const ratio = index / this.snake.length;
      const hue = 250 - ratio * 70; // 250 (紫) → 180 (青)
      const lightness = 60 + ratio * 10;

      if (index === 0) {
        // 蛇头——特殊处理
        ctx.fillStyle = '#6c5ce7';
        ctx.shadowColor = '#6c5ce7';
        ctx.shadowBlur = 12;
        this.roundRect(x + padding, y + padding, gs - padding * 2, gs - padding * 2, radius);
        ctx.fill();
        ctx.shadowBlur = 0;

        // 眼睛
        const eyeSize = 3;
        let ex1, ey1, ex2, ey2;
        const cx = x + gs / 2;
        const cy = y + gs / 2;
        if (this.direction.x === 1) { // 右
          ex1 = cx + 3; ey1 = cy - 3;
          ex2 = cx + 3; ey2 = cy + 3;
        } else if (this.direction.x === -1) { // 左
          ex1 = cx - 3; ey1 = cy - 3;
          ex2 = cx - 3; ey2 = cy + 3;
        } else if (this.direction.y === -1) { // 上
          ex1 = cx - 3; ey1 = cy - 3;
          ex2 = cx + 3; ey2 = cy - 3;
        } else { // 下
          ex1 = cx - 3; ey1 = cy + 3;
          ex2 = cx + 3; ey2 = cy + 3;
        }
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(ex1, ey1, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ex2, ey2, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0a0a0f';
        ctx.beginPath();
        ctx.arc(ex1 + this.direction.x * 1, ey1 + this.direction.y * 1, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ex2 + this.direction.x * 1, ey2 + this.direction.y * 1, 1.5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // 蛇身
        ctx.fillStyle = `hsl(${hue}, 70%, ${lightness}%)`;
        ctx.shadowColor = `hsla(${hue}, 70%, ${lightness}%, 0.3)`;
        ctx.shadowBlur = 6;
        this.roundRect(x + padding, y + padding, gs - padding * 2, gs - padding * 2, radius);
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    });

    // 暂停 / GameOver 覆盖层
    if (this.isPaused && !this.isGameOver) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.fillStyle = '#e8e8f0';
      ctx.font = '24px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⏸ 暂停中', this.canvas.width / 2, this.canvas.height / 2);
      ctx.font = '14px "Inter", sans-serif';
      ctx.fillStyle = '#9090a8';
      ctx.fillText('按 Space / P 继续', this.canvas.width / 2, this.canvas.height / 2 + 40);
    }
  }

  roundRect(x, y, w, h, r) {
    const ctx = this.ctx;
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
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          this.setDirection(0, -1);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          this.setDirection(0, 1);
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          this.setDirection(-1, 0);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          this.setDirection(1, 0);
          break;
        case ' ':
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
    this.unbindControls();
  }
}

// 注册到全局游戏注册表
window.__GAMES = window.__GAMES || {};
window.__GAMES.snake = SnakeGame;
