let projects = [];
let archivedProjects = [];
let dragSrcEl = null;

// Load from localStorage on startup
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
  localStorage.setItem('protrack_projects', JSON.stringify({
    projects,
    archived: archivedProjects
  }));
}

// Render all project cards
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

    // Calculate progress
    let completedWeight = 0;
    project.milestones.forEach(m => {
      if (m.completed) completedWeight += m.weight;
    });
    const progress = Math.min(100, completedWeight);

    card.innerHTML = `
      <div class="project-header">
        <input type="text" class="project-title-input" value="${escapeHtml(project.title)}" data-index="${index}" />
        <button class="archive-btn" data-index="${index}" title="Archive">×</button>
      </div>
      <div class="project-progress">
        <div class="progress-bar-bg">
          <div class="progress-bar-fill" style="width: ${progress}%"></div>
        </div>
        <span class="progress-text">${progress}%</span>
      </div>
      <div class="milestones-list">
        ${project.milestones.map((m, mi) => `
          <div class="milestone-item ${m.completed ? 'completed' : ''}">
            <input type="checkbox" class="milestone-checkbox" data-project="${index}" data-milestone="${mi}" ${m.completed ? 'checked' : ''} />
            <span class="milestone-label">${escapeHtml(m.title)}</span>
          </div>
        `).join('')}
      </div>
    `;

    // Drag events
    card.addEventListener('dragstart', handleDragStart);
    card.addEventListener('dragover', handleDragOver);
    card.addEventListener('drop', handleDrop);
    card.addEventListener('dragend', handleDragEnd);

    container.appendChild(card);
  });

  attachCardEventListeners();
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Card event listeners (title edit, milestone toggle, archive)
function attachCardEventListeners() {
  // Title editing
  document.querySelectorAll('.project-title-input').forEach(input => {
    input.addEventListener('change', (e) => {
      const index = parseInt(e.target.dataset.index);
      projects[index].title = e.target.value;
      saveState();
    });
  });

  // Milestone checkboxes
  document.querySelectorAll('.milestone-checkbox').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const pIndex = parseInt(e.target.dataset.project);
      const mIndex = parseInt(e.target.dataset.milestone);
      projects[pIndex].milestones[mIndex].completed = e.target.checked;
      saveState();
      renderProjects();
    });
  });

  // Archive buttons
  document.querySelectorAll('.archive-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const index = parseInt(e.target.dataset.index);
      pendingArchiveIndex = index;
      document.getElementById('archive-confirm-dialog').showModal();
    });
  });
}

// Drag & Drop handlers
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
  const srcIndex = parseInt(dragSrcEl.dataset.index);
  const destIndex = parseInt(this.dataset.index);

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

// New Project Modal
let pendingArchiveIndex = -1;

document.getElementById('add-project-btn').addEventListener('click', () => {
  resetNewProjectForm();
  document.getElementById('new-project-dialog').showModal();
});

function resetNewProjectForm() {
  document.getElementById('project-title').value = '';
  const list = document.getElementById('milestones-list');
  list.innerHTML = '';
  addMilestoneRow(list);
  updateMilestoneTotal();
}

function addMilestoneRow(container) {
  const row = document.createElement('div');
  row.className = 'milestone-row';
  row.innerHTML = `
    <input type="text" placeholder="Milestone name..." />
    <input type="number" min="1" max="100" value="25" title="Weight %" />
    <button type="button" class="remove-milestone-btn">×</button>
  `;

  row.querySelector('.remove-milestone-btn').addEventListener('click', () => {
    if (container.children.length > 1) {
      row.remove();
      updateMilestoneTotal();
    }
  });

  row.querySelectorAll('input').forEach(input => {
    input.addEventListener('input', updateMilestoneTotal);
  });

  container.appendChild(row);
}

function updateMilestoneTotal() {
  const rows = document.querySelectorAll('#milestones-list .milestone-row');
  let total = 0;
  rows.forEach(row => {
    const weightInput = row.querySelector('input[type="number"]');
    total += parseInt(weightInput.value) || 0;
  });

  const totalEl = document.getElementById('milestone-total');
  totalEl.textContent = `Total: ${total}%`;
  totalEl.className = 'total-display ' + (total === 100 ? 'valid' : 'invalid');

  const titleInput = document.getElementById('project-title');
  const saveBtn = document.getElementById('save-project-btn');
  saveBtn.disabled = !(titleInput.value.trim() && total === 100);
}

document.getElementById('add-milestone-btn').addEventListener('click', () => {
  addMilestoneRow(document.getElementById('milestones-list'));
});

document.getElementById('new-project-form').addEventListener('submit', (e) => {
  e.preventDefault();

  const title = document.getElementById('project-title').value.trim();
  if (!title) return;

  const rows = document.querySelectorAll('#milestones-list .milestone-row');
  const milestones = [];
  let valid = true;

  rows.forEach(row => {
    const nameInput = row.querySelector('input[type="text"]');
    const weightInput = row.querySelector('input[type="number"]');
    if (!nameInput.value.trim()) {
      valid = false;
      return;
    }
    milestones.push({
      title: nameInput.value.trim(),
      weight: parseInt(weightInput.value) || 0,
      completed: false
    });
  });

  if (!valid) return;

  const project = {
    id: Date.now().toString(),
    title,
    milestones
  };

  projects.push(project);
  saveState();
  renderProjects();
  document.getElementById('new-project-dialog').close();
});

// Archive confirmation
document.getElementById('confirm-archive-btn').addEventListener('click', () => {
  if (pendingArchiveIndex >= 0 && pendingArchiveIndex < projects.length) {
    const [project] = projects.splice(pendingArchiveIndex, 1);
    archivedProjects.push(project);
    saveState();
    renderProjects();
  }
  document.getElementById('archive-confirm-dialog').close();
});

// Settings dialog
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
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

  if (tab === 'active') {
    if (projects.length === 0) {
      content.innerHTML = '<p>No active projects.</p>';
      return;
    }
    projects.forEach((p, i) => {
      const item = document.createElement('div');
      item.className = 'settings-project-item';
      item.innerHTML = `
        <span>${escapeHtml(p.title)}</span>
        <div class="settings-project-actions">
          <button class="restore-btn" data-action="archive" data-index="${i}">Archive</button>
          <button class="delete-btn" data-action="delete-active" data-index="${i}">Delete</button>
        </div>
      `;
      content.appendChild(item);
    });
  } else {
    if (archivedProjects.length === 0) {
      content.innerHTML = '<p>No archived projects.</p>';
      return;
    }
    archivedProjects.forEach((p, i) => {
      const item = document.createElement('div');
      item.className = 'settings-project-item';
      item.innerHTML = `
        <span>${escapeHtml(p.title)}</span>
        <div class="settings-project-actions">
          <button class="restore-btn" data-action="restore" data-index="${i}">Restore</button>
          <button class="delete-btn" data-action="delete-archived" data-index="${i}">Delete Forever</button>
        </div>
      `;
      content.appendChild(item);
    });
  }

  // Attach action handlers
  content.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.dataset.action;
      const index = parseInt(btn.dataset.index);

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

// Tauri menu integration
async function setupMenu() {
  try {
    const { listen } = await import('@tauri-apps/api/event');

    await listen('menu-about', () => {
      document.getElementById('about-dialog').showModal();
    });

    await listen('menu-settings', () => {
      openSettings();
    });
  } catch (e) {
    // Running in browser, no Tauri API
  }
}

// Initialize
loadState();
renderProjects();
setupMenu();
