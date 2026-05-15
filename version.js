/* ============================================
   Alchemist's Lab · 构建版本信息
   ============================================ */
(function() {
  const BUILD_TIME = '2026.05.15.2339';

  function addVersionBadge() {
    const badge = document.createElement('div');
    badge.id = 'version-badge';
    badge.innerHTML = `
      <span class="v-icon">⚡</span>
      <span class="v-text">v${BUILD_TIME}</span>
    `;
    document.body.appendChild(badge);

    const style = document.createElement('style');
    style.textContent = `
      #version-badge {
        position: fixed;
        bottom: 12px;
        right: 12px;
        z-index: 9999;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        background: rgba(10, 10, 15, 0.6);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(30, 30, 48, 0.5);
        border-radius: 100px;
        font-family: 'JetBrains Mono', monospace;
        font-size: 0.65rem;
        color: rgba(144, 144, 168, 0.5);
        cursor: default;
        user-select: none;
        pointer-events: none;
        transition: color 0.3s ease;
        line-height: 1;
      }
      #version-badge .v-icon { color: rgba(108, 92, 231, 0.4); }
      #version-badge:hover { color: rgba(144, 144, 168, 0.8); }
      #version-badge:hover .v-icon { color: rgba(108, 92, 231, 0.7); }
    `;
    document.head.appendChild(style);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addVersionBadge);
  } else {
    addVersionBadge();
  }

  console.log(
    `%c ⚡ v${BUILD_TIME} %c Alchemist's Lab`,
    'background: #6c5ce7; color: #fff; font-size: 10px; padding: 2px 6px; border-radius: 2px; font-weight: bold;',
    'color: #9090a8; font-size: 11px;'
  );
})();