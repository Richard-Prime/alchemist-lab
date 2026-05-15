/* ============================================
   Alchemist's Lab · 游戏厅交互脚本
   小游戏框架：先做骨架，后续逐个实现 🎮
   ============================================ */

// ========== 游戏数据 ==========
const gamesData = [
  {
    id: 'snake',
    icon: '🐍',
    title: '贪吃蛇',
    desc: '经典街机玩法，键盘方向键控制，吃豆长大，撞墙即死。',
    category: 'arcade',
    difficulty: 'easy',
    status: 'ready', // coming-soon | in-progress | ready
  },
  {
    id: 'tetris',
    icon: '🧱',
    title: '俄罗斯方块',
    desc: '经典下落式方块消除游戏，支持旋转、加速、预览下一个。',
    category: 'puzzle',
    difficulty: 'medium',
    status: 'ready',
  },
  {
    id: 'minesweeper',
    icon: '💣',
    title: '扫雷',
    desc: '经典逻辑推理游戏，找出所有地雷即可获胜。',
    category: 'puzzle',
    difficulty: 'medium',
    status: 'ready',
  },
  {
    id: 'flappy',
    icon: '🐤',
    title: 'Flappy Bird',
    desc: '点击/空格控制小鸟飞行，穿越管道障碍，挑战最高分。',
    category: 'action',
    difficulty: 'hard',
    status: 'coming-soon',
  },
  {
    id: '2048',
    icon: '🔢',
    title: '2048',
    desc: '合并相同数字方块，挑战到达 2048！支持键盘滑动。',
    category: 'puzzle',
    difficulty: 'medium',
    status: 'ready',
  },
  {
    id: 'pong',
    icon: '🏓',
    title: '乒乓球',
    desc: '人机对战，经典街机乒乓，看谁先得 5 分。',
    category: 'arcade',
    difficulty: 'easy',
    status: 'ready',
  },
  {
    id: 'space-invaders',
    icon: '👾',
    title: '太空入侵者',
    desc: '操控飞船抵御外星侵略者，消灭全部敌人过关。',
    category: 'action',
    difficulty: 'hard',
    status: 'coming-soon',
  },
  {
    id: 'tictactoe',
    icon: '❌',
    title: '井字棋',
    desc: '三子棋人机对战，AI 使用 Minimax 算法，永不落败。',
    category: 'strategy',
    difficulty: 'easy',
    status: 'ready',
  },
  {
    id: 'sudoku',
    icon: '🧩',
    title: '数独',
    desc: '经典九宫格数字推理，提供三个难度等级，自动验证。',
    category: 'strategy',
    difficulty: 'hard',
    status: 'coming-soon',
  },
];

// ========== 渲染游戏卡片 ==========
function renderGames(filter = 'all') {
  const grid = document.getElementById('gamesGrid');

  const filtered = filter === 'all'
    ? gamesData
    : gamesData.filter(g => g.category === filter);

  grid.innerHTML = filtered.map((game, index) => {
    const diffLabel = { easy: '简单', medium: '中等', hard: '困难' };
  const statusLabel = game.status === 'coming-soon' ? '🔥 开发中' : game.status === 'ready' ? '🎮 开玩' : '🚧 施工中';

    return `
      <div class="game-card ${game.status === 'ready' ? 'game-ready' : ''}" data-game-id="${game.id}" data-category="${game.category}" style="animation-delay: ${index * 0.08}s">
        <div class="game-card-icon">${game.icon}</div>
        <h3>${game.title} ${game.status === 'ready' ? '<span class="game-ready-badge">▶ 开玩</span>' : ''}</h3>
        <p>${game.desc}</p>
        <div class="game-meta">
          <span class="game-tag">${game.category === 'action' ? '动作' : game.category === 'puzzle' ? '益智' : game.category === 'arcade' ? '街机' : '策略'}</span>
          <span class="game-difficulty ${game.difficulty}">${diffLabel[game.difficulty]}</span>
        </div>
      </div>
    `;
  }).join('');

  // 绑定卡片点击事件
  document.querySelectorAll('.game-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.gameId;
      const game = gamesData.find(g => g.id === id);
      if (game) handleGameClick(game);
    });
  });
}

// ========== 游戏点击处理 ==========
function handleGameClick(game) {
  if (game.status === 'coming-soon') {
    showComingSoon(game);
  } else if (game.status === 'ready') {
    window.location.href = `play-${game.id}.html`;
  } else {
    showComingSoon(game);
  }
}

// ========== 开发中弹窗 ==========
function showComingSoon(game) {
  // 移除可能已存在的弹窗
  const existing = document.querySelector('.game-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.className = 'game-modal-overlay';
  overlay.innerHTML = `
    <div class="game-modal">
      <div class="game-modal-icon">🛠️</div>
      <h3>${game.icon} ${game.title}</h3>
      <p class="game-modal-status">🔥 正在开发中</p>
      <p class="game-modal-desc">这个游戏正在被精心打造，很快就会上线！</p>
      <div class="game-modal-progress">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${Math.floor(Math.random() * 30 + 10)}%"></div>
        </div>
        <span class="progress-label">进度加载中...</span>
      </div>
      <div class="game-modal-tech">
        <span>Canvas</span>
        <span>JS</span>
        <span>Game Loop</span>
      </div>
      <button class="btn primary" onclick="this.closest('.game-modal-overlay').remove()">知道啦，期待！</button>
    </div>
  `;

  document.body.appendChild(overlay);

  // 点击遮罩层关闭
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });

  // 进度条动画
  requestAnimationFrame(() => {
    const fill = overlay.querySelector('.progress-fill');
    const target = parseInt(fill.style.width);
    fill.style.width = '0%';
    setTimeout(() => {
      fill.style.width = target + '%';
      fill.style.transition = 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)';

      const label = overlay.querySelector('.progress-label');
      let current = 0;
      const interval = setInterval(() => {
        current += Math.floor(Math.random() * 8 + 2);
        if (current >= target) {
          current = target;
          clearInterval(interval);
          label.textContent = `完成度 ${current}% · 即将发布 🚀`;
        } else {
          label.textContent = `完成度 ${current}% · 努力开发中...`;
        }
      }, 200);
    }, 100);
  });
}

// ========== 分类筛选 ==========
const filterBtns = document.querySelectorAll('.filter-btn');

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderGames(btn.dataset.filter);
  });
});

// ========== 数字动画（与主站复用逻辑） ==========
function animateGameNumbers() {
  const nums = document.querySelectorAll('.stat-num[data-target]');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.getAttribute('data-target'));
        const duration = 2000;
        const startTime = performance.now();

        function update(currentTime) {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.floor(eased * target);
          if (progress < 1) requestAnimationFrame(update);
          else el.textContent = target;
        }

        requestAnimationFrame(update);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  nums.forEach(num => observer.observe(num));
}
animateGameNumbers();

// ========== 初始化渲染 ==========
renderGames();

console.log('%c 🎮 Game Hub Loaded ',
  'background: #fd79a8; color: #fff; font-size: 14px; padding: 8px 12px; border-radius: 4px; font-weight: bold;'
);
const tetrisReadyCount = gamesData.filter(g => g.status === 'ready').length;
console.log(`%c 📦 ${gamesData.length} games planned, ${tetrisReadyCount} implemented. Let's build!`,
  'color: #00cec9; font-size: 12px;'
);
