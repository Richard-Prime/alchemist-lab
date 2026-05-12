/* ============================================
   Alchemist's Lab · 博客交互脚本
   ============================================ */

// ========== 1. 粒子背景 ==========
const canvas = document.getElementById('particles');
const ctx = canvas.getContext('2d');

let particles = [];
let mouseX = 0;
let mouseY = 0;

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

class Particle {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 2 + 0.5;
    this.speedX = (Math.random() - 0.5) * 0.5;
    this.speedY = (Math.random() - 0.5) * 0.5;
    this.opacity = Math.random() * 0.5 + 0.1;
    this.hue = Math.random() > 0.5 ? 250 : 180; // 紫色系 or 青色系
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;

    // 鼠标影响（轻微引力）
    const dx = mouseX - this.x;
    const dy = mouseY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 200) {
      const force = (200 - dist) / 200 * 0.3;
      this.x += dx / dist * force;
      this.y += dy / dist * force;
    }

    // 边界回弹
    if (this.x < 0 || this.x > canvas.width) this.speedX *= -1;
    if (this.y < 0 || this.y > canvas.height) this.speedY *= -1;
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${this.hue}, 70%, 60%, ${this.opacity})`;
    ctx.fill();
  }
}

function initParticles() {
  const count = Math.min(Math.floor(canvas.width * canvas.height / 12000), 80);
  particles = [];
  for (let i = 0; i < count; i++) {
    particles.push(new Particle());
  }
}
initParticles();
window.addEventListener('resize', initParticles);

document.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

function connectParticles() {
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 150) {
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.strokeStyle = `hsla(250, 60%, 70%, ${0.08 * (1 - dist / 150)})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }
}

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => {
    p.update();
    p.draw();
  });
  connectParticles();
  requestAnimationFrame(animateParticles);
}
animateParticles();

// ========== 2. 导航栏滚动效果 ==========
const navbar = document.getElementById('navbar');

if (navbar) {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });
}

// ========== 3. 移动端菜单 ==========
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');

if (menuToggle && navLinks) {
  menuToggle.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });

  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
    });
  });
}

// ========== 4. 数字滚动动画 ==========
function animateNumbers() {
  const nums = document.querySelectorAll('.stat .num');

  if (nums.length === 0) return;

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
          const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
          const current = Math.floor(eased * target);
          el.textContent = current;

          if (progress < 1) {
            requestAnimationFrame(update);
          } else {
            el.textContent = target + (target >= 1000 ? '+' : '');
          }
        }

        requestAnimationFrame(update);
        observer.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  nums.forEach(num => observer.observe(num));
}
animateNumbers();

// ========== 5. 博客文章数据 ==========
const blogPosts = [
  {
    tag: 'React',
    title: 'React 19 新特性一览：并发模式深入实践',
    excerpt: '深入解析 React 19 中的新 API 和并发渲染机制，以及如何在项目中落地应用。',
    date: '2026-05-10',
    readTime: '8 min',
  },
  {
    tag: 'TypeScript',
    title: 'TypeScript 类型体操：从入门到放弃再到精通',
    excerpt: '通过一系列实用的类型挑战，掌握 TypeScript 高级类型编程的核心思想。',
    date: '2026-05-03',
    readTime: '12 min',
  },
  {
    tag: 'CSS',
    title: '现代 CSS 魔法：容器查询、视图过渡与瀑布流',
    excerpt: '探讨 CSS 最新特性如何改变我们的布局方式和用户体验设计。',
    date: '2026-04-22',
    readTime: '6 min',
  },
  {
    tag: 'Architecture',
    title: '微前端架构的得与失：两年实践复盘',
    excerpt: '在多个业务线中落地微前端的经验总结，包括坑点与最佳实践。',
    date: '2026-04-15',
    readTime: '10 min',
  },
  {
    tag: 'Rust',
    title: '用 Rust 重写构建工具后，发生了什么？',
    excerpt: '一次将 Node.js 构建工具迁移到 Rust 的完整心路历程与性能对比。',
    date: '2026-04-08',
    readTime: '7 min',
  },
  {
    tag: 'AI',
    title: 'LLM 辅助编程的正确姿势',
    excerpt: '如何高效利用 AI 辅助编码，而不是被 AI 带偏思路？一些实用建议。',
    date: '2026-03-30',
    readTime: '5 min',
  },
];

function renderBlogPosts() {
  const grid = document.getElementById('blogGrid');
  if (!grid) return; // 兼容 games.html 没有博客模块
  grid.innerHTML = blogPosts.map(post => `
    <article class="blog-card">
      <span class="tag">${post.tag}</span>
      <h3>${post.title}</h3>
      <p>${post.excerpt}</p>
      <div class="meta">
        <time datetime="${post.date}">${post.date}</time>
        <span class="read-more">${post.readTime} 阅读 →</span>
      </div>
    </article>
  `).join('');
}
renderBlogPosts();

// ========== 6. 滚动渐入动画 ==========
function setupScrollReveal() {
  const revealElements = document.querySelectorAll(
    '.section-title, .about-text, .about-terminal, .blog-card, .project-card, .contact-content'
  );

  if (revealElements.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  revealElements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
    observer.observe(el);
  });
}
setupScrollReveal();

// 为卡片添加延迟
document.querySelectorAll('.blog-card, .project-card').forEach((card, index) => {
  card.style.transitionDelay = `${index * 0.1}s`;
});

// ========== 7. 平滑锚点滚动 & 活跃导航高亮 ==========
const allSections = document.querySelectorAll('.section, .hero');

function updateActiveNav() {
  const scrollPos = window.scrollY + 100;

  allSections.forEach(section => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.offsetHeight;
    const id = section.getAttribute('id');

    if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
      navLinks.querySelectorAll('a').forEach(link => {
        link.style.color = link.getAttribute('href') === `#${id}`
          ? 'var(--text-primary)'
          : '';
      });
    }
  });
}

if (allSections.length > 0 && navLinks) {
  window.addEventListener('scroll', updateActiveNav);
}

console.log('%c ⚡ Alchemist\'s Lab Loaded ',
  'background: #6c5ce7; color: #fff; font-size: 14px; padding: 8px 12px; border-radius: 4px; font-weight: bold;'
);
console.log('%c ✦ Build something amazing today.',
  'color: #00cec9; font-size: 12px;'
);