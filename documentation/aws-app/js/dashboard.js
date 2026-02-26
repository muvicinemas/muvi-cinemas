/* ================================================================
   Muvi UAE – AWS Ecosystem Dashboard  ·  UI Logic
   ================================================================ */

document.addEventListener('DOMContentLoaded', () => {
  renderClock();
  renderPhaseBar();
  renderCostStrip();
  renderGrid();
  bindOverlay();
});

/* ─── CLOCK ─── */
function renderClock() {
  const el = document.getElementById('clock');
  const tick = () => {
    const now = new Date();
    el.textContent = now.toLocaleTimeString('en-GB', { hour12: false });
  };
  tick();
  setInterval(tick, 1000);
}

/* ─── PHASE BAR ─── */
function renderPhaseBar() {
  const bar = document.getElementById('phaseBar');
  bar.innerHTML = INFRA.phases.map((p, i) => {
    const cls = p.status === 'complete' ? 'phase-pill--complete'
              : p.status === 'active'   ? 'phase-pill--active'
              : 'phase-pill--pending';
    const icon = p.status === 'complete' ? '✓'
               : p.status === 'active'   ? '▶'
               : '○';
    const arrow = i < INFRA.phases.length - 1 ? '<span class="phase-arrow">→</span>' : '';
    const title = p.date ? `Completed ${p.date}` : 'Not started';
    return `<span class="phase-pill ${cls}" title="${title}">
              <span class="phase-pill__icon">${icon}</span>${p.id} ${p.name}
            </span>${arrow}`;
  }).join('');
}

/* ─── COST STRIP ─── */
function renderCostStrip() {
  const cards = INFRA.cards;
  const activeCost = cards.reduce((sum, c) => sum + (c.costPerMonth || 0), 0);
  const pending = INFRA.phases.filter(p => p.status === 'pending').length;
  const updated = new Date(INFRA.meta.lastUpdated);

  document.getElementById('totalCost').textContent = `$${INFRA.meta.totalMonthlyCost.toLocaleString()}/mo`;
  document.getElementById('activeResources').textContent = `$${activeCost.toLocaleString()}/mo active`;
  document.getElementById('pendingPhases').textContent = `${pending} of ${INFRA.phases.length}`;
  document.getElementById('lastUpdated').textContent = updated.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

/* ─── GRID ─── */
function renderGrid() {
  const grid = document.getElementById('grid');
  grid.innerHTML = INFRA.cards.map(card => buildCard(card)).join('');
}

function buildCard(c) {
  const statusClass = c.status === 'available' ? 'available'
                    : c.status === 'creating'  ? 'creating'
                    : c.status === 'error'     ? 'error'
                    : 'pending';
  const statusLabel = c.status === 'available' ? 'Available'
                    : c.status === 'creating'  ? 'Creating…'
                    : c.status === 'error'     ? 'Error'
                    : 'Phase Pending';
  const pulseColor = c.status === 'available' ? 'green'
                   : c.status === 'creating'  ? 'yellow'
                   : c.status === 'error'     ? 'red'
                   : 'gray';

  const stats = c.stats.map(s =>
    `<div class="card__stat">
       <span class="card__stat-value">${s.value}</span>
       <span class="card__stat-label">${s.label}</span>
     </div>`
  ).join('');

  const rows = c.table.rows.map(r => {
    const cells = r.map((cell, i) => {
      let cls = '';
      const low = cell.toLowerCase();
      if (low === 'available' || low === 'active') cls = 'status--available';
      else if (low === 'creating' || low === 'creating…') cls = 'status--creating';
      else if (low === 'deleting') cls = 'status--deleting';
      else if (low === 'pending' || low.startsWith('not ')) cls = 'status--pending';
      else if (cell.includes('.amazonaws.com') || cell.includes('.rds.')) cls = 'endpoint';
      return `<td class="${cls}">${cell}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  const headers = c.table.headers.map(h => `<th>${h}</th>`).join('');

  const cost = c.costPerMonth !== null
    ? `<span class="card__footer-cost">~$${c.costPerMonth}/mo</span>`
    : `<span class="card__footer-cost">Summary</span>`;

  return `
    <div class="card" data-card-id="${c.id}">
      <div class="card__glow card__glow--${c.glow}"></div>
      <div class="card__header">
        <div class="card__title-group">
          <div class="card__icon-title">
            <span class="card__icon">${c.icon}</span>
            <span class="card__title">${c.title}</span>
          </div>
          <span class="card__subtitle">${c.subtitle}</span>
        </div>
        <span class="card__badge card__badge--${statusClass}">
          <span class="pulse pulse--${pulseColor}"></span>
          ${statusLabel}
        </span>
      </div>
      <div class="card__stats">${stats}</div>
      <div class="card__table-wrap">
        <table class="card__table">
          <thead><tr>${headers}</tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="card__footer">
        ${cost}
        <span class="card__footer-hint">Click to expand →</span>
      </div>
    </div>`;
}

/* ─── OVERLAY / DETAIL PANEL ─── */
function bindOverlay() {
  const overlay = document.getElementById('overlay');
  const closeBtn = document.getElementById('detailClose');

  // card click
  document.getElementById('grid').addEventListener('click', (e) => {
    const card = e.target.closest('.card');
    if (!card) return;
    const id = card.dataset.cardId;
    const data = INFRA.cards.find(c => c.id === id);
    if (!data || !data.detail) return;
    openDetail(data);
  });

  // close
  closeBtn.addEventListener('click', () => closeOverlay());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeOverlay();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeOverlay();
  });
}

function openDetail(card) {
  const overlay = document.getElementById('overlay');
  const header = document.getElementById('detailHeader');
  const body = document.getElementById('detailBody');

  const statusClass = card.status === 'available' ? 'available' : 'pending';
  const statusLabel = card.status === 'available' ? 'Available' : 'Phase Pending';
  const pulseColor = card.status === 'available' ? 'green' : 'gray';

  header.innerHTML = `
    <h2>
      <span>${card.icon}</span>
      ${card.title}
      <span class="card__badge card__badge--${statusClass}" style="margin-left:.5rem">
        <span class="pulse pulse--${pulseColor}"></span>
        ${statusLabel}
      </span>
    </h2>
    <p>${card.detail.description}</p>`;

  body.innerHTML = card.detail.sections.map(sec => {
    let content = '';
    if (sec.type === 'kv') {
      content = `<div class="detail-kv">${sec.data.map(([k, v]) =>
        `<span class="detail-kv__key">${k}</span>
         <span class="detail-kv__value">${v}</span>`
      ).join('')}</div>`;
    } else if (sec.type === 'table') {
      const ths = sec.headers.map(h => `<th>${h}</th>`).join('');
      const trs = sec.rows.map(r => {
        const tds = r.map(cell => {
          let cls = '';
          const low = ('' + cell).toLowerCase();
          if (low === 'available' || low === 'active') cls = 'status--available';
          else if (low.startsWith('not ') || low === 'pending') cls = 'status--pending';
          else if (cell.includes('.amazonaws.com')) cls = 'endpoint';
          return `<td class="${cls}">${cell}</td>`;
        }).join('');
        return `<tr>${tds}</tr>`;
      }).join('');
      content = `<table class="detail-table"><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
    } else if (sec.type === 'note') {
      content = `<div class="detail-note">${sec.text}</div>`;
    }
    return `<div class="detail-section">
              <div class="detail-section__title">${sec.title}</div>
              ${content}
            </div>`;
  }).join('');

  overlay.classList.add('overlay--open');
  document.body.style.overflow = 'hidden';
}

function closeOverlay() {
  document.getElementById('overlay').classList.remove('overlay--open');
  document.body.style.overflow = '';
}
