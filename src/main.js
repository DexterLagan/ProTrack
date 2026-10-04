let projects = [];
let archivedProjects = [];
let dragSrcEl = null;

// Dialog state
let draftMilestones = [];
let editingProjectIndex = null;
let pendingArchiveIndex = -1;
let pendingDelete = { project: -1, milestone: -1 };

// ---------- Persistence ----------
function loadState() {
  const saved = localStorage.getItem('protrack_projects');
  if (saved) {
    try {
      const data = JSON.parse(saved);
      projects = data.projects || [];
      archivedProjects = data.archived || [];
    } catch (e) {}
  }
}

function saveState() {
  localStorage.setItem(
    'protrack_projects',
    JSON.stringify({ projects, archived: archivedProjects })
  );
}

// ---------- Theme ----------
const MOON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
const SUN_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`;

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const btn = document.getElementById('theme-toggle');
  btn.innerHTML = theme === 'dark' ? SUN_SVG : MOON_SVG;
  btn.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
}

function initTheme() {
  const saved = localStorage.getItem('protrack_theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved || (prefersDark ? 'dark' : 'light'));
}

// ---------- Milestone weight helpers ----------
function roundToSum(values, target) {
  if (values.length === 0) return [];
  const sum = values.reduce((a, b) => a + b, 0);
  if (sum <= 0) {
    const base = Math.floor(target / values.length);
    const out = values.map(() => base);
    let rem = target - base * values.length;
    for (let i = 0; i < out.length && rem > 0; i++, rem--) out[i]++;
    return out;
  }
  const raw = values.map((v) => (v * target) / sum);
  const out = raw.map((v) => Math.floor(v));
  let rem = target - out.reduce((a, b) => a + b, 0);
  const order = raw
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);
  for (let k = 0; k < rem; k++) out[order[k % order.length].i]++;
  return out;
}

// Keep milestones[idx].weight fixed, rescale the rest so the total equals target
function rebalanceKeeping(milestones, idx, target = 100) {
  if (milestones.length === 0) return;
  if (milestones.length === 1) {
    milestones[0].weight = target;
    return;
  }
  let fixed = Math.round(Number(milestones[idx].weight) || 0);
  fixed = Math.max(0, Math.min(target, fixed));
  milestones[idx].weight = fixed;

  const restIdx = milestones.map((_, i) => i).filter((i) => i !== idx);
  const restWeights = restIdx.map((i) => Math.max(0, Number(milestones[i].weight) || 0));
  const newRest = roundToSum(restWeights, target - fixed);
  restIdx.forEach((i, k) => {
    milestones[i].weight = newRest[k];
  });
}

// Rescale every milestone proportionally so the total equals target
function rebalanceAll(milestones, target = 100) {
  if (milestones.length === 0) return;
  const weights = milestones.map((m) => Math.max(0, Number(m.weight) || 0));
  const newWeights = roundToSum(weights, target);
  milestones.forEach((m, i) => {
    m.weight = newWeights[i];
  });
}

function projectProgress(milestones) {
  const completed = milestones.reduce(
    (a, m) => a + (m.completed ? Number(m.weight) || 0 : 0),
    0
  );
  return Math.min(100, completed);
}

// ---------- Utilities ----------
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text == null ? '' : text;
  return div.innerHTML;
}

// ---------- Rendering ----------
function renderProjects() {
  const container = document.getElementById('projects-container');
  container.innerHTML = '';

  if (projects.length === 0) {
    container.innerHTML = '<div class="empty-state">No projects yet. Click + to create one.</div>';
    return;
  }

  projects.forEach((project, index) => {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.draggable = true;
    card.dataset.index = index;

    const progress = projectProgress(project.milestones);

    card.innerHTML = `
      <div class="project-header">
        <input type="text" class="project-title-input" value="${escapeHtml(project.title)}" data-index="${index}" />
        <button class="card-action-btn add-milestone-btn" data-index="${index}" title="Add / edit milestones">+</button>
        <button class="card-action-btn archive-btn" data-index="${index}" title="Archive">×</button>
      </div>
      <div class="project-progress">
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width: ${progress}%"></div>
        </div>
        <span class="progress-text">${progress}%</span>
      </div>
      <div class="milestones-list">
        ${
          project.milestones.length === 0
            ? '<div class="empty-state">No milestones yet. Click + to add one.</div>'
            : project.milestones
                .map(
                  (m, mi) => `
          <div class="milestone-item ${m.completed ? 'completed' : ''}">
            <input type="checkbox" class="milestone-checkbox" data-project="${index}" data-milestone="${mi}" ${m.completed ? 'checked' : ''} />
            <span class="milestone-label" data-project="${index}" data-milestone="${mi}" title="Click to edit">${escapeHtml(m.title)}</span>
            <button class="delete-milestone-btn" data-project="${index}" data-milestone="${mi}" title="Delete milestone">×</button>
          </div>`
                )
                .join('')
        }
      </div>
    `;

    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragover', handleDragOver);
    card.addEventListener('drop', handleDrop);
    card.addEventListener('dragend', handleDragEnd);

    container.appendChild(card);
  });

  attachCardEventListeners();
}

function attachCardEventListeners() {
  document.querySelectorAll('.project-title-input').forEach((input) => {
    input.addEventListener('change', (e) => {
      const index = parseInt(e.target.dataset.index, 10);
      projects[index].title = e.target.value;
      saveState();
    });
  });

  document.querySelectorAll('.milestone-checkbox').forEach((cb) => {
    cb.addEventListener('change', (e) => {
      const pIndex = parseInt(e.target.dataset.project, 10);
      const mIndex = parseInt(e.target.dataset.milestone, 10);
      projects[pIndex].milestones[mIndex].completed = e.target.checked;
      saveState();
      renderProjects();
    });
  });

  document.querySelectorAll('.archive-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      pendingArchiveIndex = parseInt(btn.dataset.index, 10);
      document.getElementById('archive-confirm-dialog').showModal();
    });
  });

  document.querySelectorAll('.add-milestone-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      openProjectDialog(parseInt(btn.dataset.index, 10));
    });
  });

  document.querySelectorAll('.milestone-label').forEach((span) => {
    span.addEventListener('click', () => startMilestoneEdit(span));
  });

  document.querySelectorAll('.delete-milestone-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const p = parseInt(btn.dataset.project, 10);
      const m = parseInt(btn.dataset.milestone, 10);
      pendingDelete = { project: p, milestone: m };
      const ms = projects[p].milestones[m];
      const textEl = document.getElementById('delete-milestone-text');
      textEl.textContent = ms.completed
        ? `"${ms.title}" is completed and worth ${ms.weight}%. Deleting it will subtract that from the project's progress.`
        : `"${ms.title}" will be removed from the project.`;
      document.getElementById('delete-milestone-dialog').showModal();
    });
  });

  // Prevent dragging the card while interacting with its controls
  document.querySelectorAll('.project-card').forEach((card) => {
    card.querySelectorAll('input, button, .milestone-label').forEach((el) => {
      el.addEventListener('mousedown', () => {
        card.draggable = false;
        const restore = () => {
          card.draggable = true;
          document.removeEventListener('mouseup', restore);
        };
        document.addEventListener('mouseup', restore);
      });
    });
  });
}

// ---------- Inline milestone title editing ----------
function startMilestoneEdit(span) {
  const pIndex = parseInt(span.dataset.project, 10);
  const mIndex = parseInt(span.dataset.milestone, 10);
  const milestone = projects[pIndex].milestones[mIndex];

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'milestone-edit-input';
  input.value = milestone.title;
  span.replaceWith(input);
  input.focus();
  input.select();

  let done = false;
  const finish = (save) => {
    if (done) return;
    done = true;
    if (save) {
      const val = input.value.trim();
      if (val) milestone.title = val;
      saveState();
    }
    renderProjects();
  };

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      finish(true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      finish(false);
    }
  });
  input.addEventListener('blur', () => finish(true));
}

// ---------- Drag & Drop ----------
function handleDragStart(e) {
  dragSrcEl = this;
  e.dataTransfer.effectAllowed = 'move';
  setTimeout(() => this.classList.add('dragging'), 0);
}

function handleDragOver(e) {
  if (this === dragSrcEl) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
}

function handleDrop(e) {
  e.stopPropagation();
  const srcIndex = parseInt(dragSrcEl.dataset.index, 10);
  const destIndex = parseInt(this.dataset.index, 10);
  if (srcIndex !== destIndex && !isNaN(srcIndex) && !isNaN(destIndex)) {
    const [moved] = projects.splice(srcIndex, 1);
    projects.splice(destIndex, 0, moved);
    saveState();
    renderProjects();
  }
}

function handleDragEnd() {
  this.classList.remove('dragging');
  dragSrcEl = null;
}

// ---------- Project dialog (new & edit) ----------
function openProjectDialog(index = null) {
  editingProjectIndex = index;
  const isEdit = index !== null;

  document.getElementById('project-dialog-title').textContent = isEdit ? 'Edit Project' : 'New Project';
  document.getElementById('save-project-btn').textContent = isEdit ? 'Save Changes' : 'Save Project';

  if (isEdit) {
    const project = projects[index];
    document.getElementById('project-title').value = project.title;
    draftMilestones = project.milestones.map((m) => ({
      title: m.title,
      weight: m.weight,
      completed: !!m.completed
    }));
  } else {
    document.getElementById('project-title').value = '';
    draftMilestones = [{ title: '', weight: 100, completed: false }];
  }

  renderDialogMilestones();
  updateProjectFormState();
  document.getElementById('project-dialog').showModal();
}

function renderDialogMilestones() {
  const list = document.getElementById('milestones-list');
  list.innerHTML = '';

  draftMilestones.forEach((m, i) => {
    const row = document.createElement('div');
    row.className = 'milestone-row';
    row.innerHTML = `
      <input type="text" class="ms-title" placeholder="Milestone name..." value="${escapeHtml(m.title)}" />
      <div class="weight-input-wrap">
        <input type="number" class="ms-weight" min="0" max="100" value="${m.weight}" />
        <span class="percent-sign">%</span>
      </div>
      <button type="button" class="remove-milestone-btn" title="Remove milestone">×</button>
    `;

    row.querySelector('.ms-title').addEventListener('input', (e) => {
      draftMilestones[i].title = e.target.value;
      updateProjectFormState();
    });

    row.querySelector('.ms-weight').addEventListener('change', (e) => {
      draftMilestones[i].weight = parseInt(e.target.value, 10) || 0;
      rebalanceKeeping(draftMilestones, i);
      renderDialogMilestones();
      updateProjectFormState();
    });

    row.querySelector('.remove-milestone-btn').addEventListener('click', () => {
      draftMilestones.splice(i, 1);
      rebalanceAll(draftMilestones);
      renderDialogMilestones();
      updateProjectFormState();
    });

    list.appendChild(row);
  });

  updateMilestoneTotal();
}

function updateMilestoneTotal() {
  const total = draftMilestones.reduce((a, m) => a + (Number(m.weight) || 0), 0);
  const totalEl = document.getElementById('milestone-total');
  totalEl.textContent = `Total: ${total}%`;
  totalEl.classList.toggle('valid', total === 100);
}

function updateProjectFormState() {
  const title = document.getElementById('project-title').value.trim();
  const anyEmpty = draftMilestones.some((m) => !m.title.trim());
  document.getElementById('save-project-btn').disabled = !title || anyEmpty;
}

document.getElementById('add-project-btn').addEventListener('click', () => {
  openProjectDialog(null);
});

document.getElementById('add-milestone-btn').addEventListener('click', () => {
  draftMilestones.push({ title: '', weight: 20, completed: false });
  rebalanceKeeping(draftMilestones, draftMilestones.length - 1);
  renderDialogMilestones();
  updateProjectFormState();
});

document.getElementById('project-title').addEventListener('input', updateProjectFormState);

document.getElementById('project-cancel-btn').addEventListener('click', () => {
  document.getElementById('project-dialog').close();
});

document.getElementById('project-form').addEventListener('submit', (e) => {
  e.preventDefault();

  if (document.getElementById('save-project-btn').disabled) return;

  const title = document.getElementById('project-title').value.trim();
  if (!title) return;

  const milestones = draftMilestones
    .map((m) => ({
      title: m.title.trim(),
      weight: Math.max(0, Math.round(Number(m.weight) || 0)),
      completed: !!m.completed
    }))
    .filter((m) => m.title !== '');
  rebalanceAll(milestones);

  if (editingProjectIndex !== null) {
    projects[editingProjectIndex].title = title;
    projects[editingProjectIndex].milestones = milestones;
  } else {
    projects.push({ id: Date.now().toString(), title, milestones });
  }

  saveState();
  renderProjects();
  document.getElementById('project-dialog').close();
});

// ---------- Archive confirmation ----------
document.getElementById('confirm-archive-btn').addEventListener('click', () => {
  if (pendingArchiveIndex >= 0 && pendingArchiveIndex < projects.length) {
    const [project] = projects.splice(pendingArchiveIndex, 1);
    archivedProjects.push(project);
    saveState();
    renderProjects();
  }
  document.getElementById('archive-confirm-dialog').close();
});

// ---------- Delete milestone confirmation ----------
document.getElementById('confirm-delete-milestone').addEventListener('click', () => {
  const { project, milestone } = pendingDelete;
  if (project >= 0 && project < projects.length) {
    projects[project].milestones.splice(milestone, 1);
    rebalanceAll(projects[project].milestones);
    saveState();
    renderProjects();
  }
  pendingDelete = { project: -1, milestone: -1 };
  document.getElementById('delete-milestone-dialog').close();
});

// ---------- Settings dialog ----------
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    renderSettingsContent(btn.dataset.tab);
  });
});

function openSettings() {
  document.querySelector('[data-tab="active"]').classList.add('active');
  document.querySelector('[data-tab="archived"]').classList.remove('active');
  renderSettingsContent('active');
  document.getElementById('settings-dialog').showModal();
}

function renderSettingsContent(tab) {
  const content = document.getElementById('settings-content');
  content.innerHTML = '';

  const list = tab === 'active' ? projects : archivedProjects;

  if (list.length === 0) {
    content.innerHTML = `<p>No ${tab} projects.</p>`;
    return;
  }

  list.forEach((p, i) => {
    const item = document.createElement('div');
    item.className = 'settings-project-item';
    const actions =
      tab === 'active'
        ? `<button class="restore-btn" data-action="archive" data-index="${i}">Archive</button>
           <button class="delete-btn" data-action="delete-active" data-index="${i}">Delete</button>`
        : `<button class="restore-btn" data-action="restore" data-index="${i}">Restore</button>
           <button class="delete-btn" data-action="delete-archived" data-index="${i}">Delete Forever</button>`;
    item.innerHTML = `<span>${escapeHtml(p.title)}</span><div class="settings-project-actions">${actions}</div>`;
    content.appendChild(item);
  });

  content.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      const index = parseInt(btn.dataset.index, 10);

      if (action === 'archive') {
        const [p] = projects.splice(index, 1);
        archivedProjects.push(p);
      } else if (action === 'delete-active') {
        projects.splice(index, 1);
      } else if (action === 'restore') {
        const [p] = archivedProjects.splice(index, 1);
        projects.push(p);
      } else if (action === 'delete-archived') {
        archivedProjects.splice(index, 1);
      }

      saveState();
      renderProjects();
      renderSettingsContent(document.querySelector('.tab-btn.active').dataset.tab);
    });
  });
}

// ---------- Initialize ----------
initTheme();
loadState();
renderProjects();

document.getElementById('theme-toggle').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  localStorage.setItem('protrack_theme', next);
});

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
  if (!localStorage.getItem('protrack_theme')) {
    applyTheme(e.matches ? 'dark' : 'light');
  }
});

// Expose functions to global scope for Tauri eval calls
window.openSettings = openSettings;
