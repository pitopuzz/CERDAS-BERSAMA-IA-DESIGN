/**
 * CERDAS BERSAMA - MVP app.js
 * Production-ready vanilla JavaScript.
 */

// ==========================================
// 1. STORAGE LAYER
// ==========================================
const saveUser = (user) => localStorage.setItem('cb_user', JSON.stringify(user));
const getUser = () => JSON.parse(localStorage.getItem('cb_user') || 'null');

const saveProgress = (nodeId) => {
    const progress = getProgress();
    if (!progress.includes(nodeId)) {
        progress.push(nodeId);
        localStorage.setItem('cb_progress', JSON.stringify(progress));
    }
};
const getProgress = () => JSON.parse(localStorage.getItem('cb_progress') || '[]');

const saveProject = (projectData) => {
    const projects = getProjects();
    projects.push({ ...projectData, date: new Date().toISOString() });
    localStorage.setItem('cb_projects', JSON.stringify(projects));
};
const getProjects = () => JSON.parse(localStorage.getItem('cb_projects') || '[]');

// ==========================================
// 2. CURRICULUM LAYER
// ==========================================
let curriculum = null;
let flatNodes = [];

const fetchCurriculum = async () => {
    const res = await fetch('./data/curriculum.json');
    curriculum = await res.json();
    curriculum.modules.forEach(m => m.nodes.forEach(n => flatNodes.push(n)));
    return curriculum;
};

const findNodeById = (id) => flatNodes.find(n => n.id === id) || null;

const getNextNode = (currentId) => {
    const idx = flatNodes.findIndex(n => n.id === currentId);
    return (idx !== -1 && idx < flatNodes.length - 1) ? flatNodes[idx + 1] : null;
};

const calculateCompletionPercent = () => {
    const progress = getProgress();
    return flatNodes.length ? Math.round((progress.length / flatNodes.length) * 100) : 0;
};

// ==========================================
// 3. UI RENDERERS
// ==========================================

const renderDashboard = () => {
    const user = getUser();
    if (!user) return window.location.href = 'index.html';
    document.getElementById('welcome-message').textContent = `Halo, ${user.name}!`;
    document.getElementById('progress-text').textContent = `${calculateCompletionPercent()}% Selesai`;
    document.querySelector('.progress-fill').style.width = `${calculateCompletionPercent()}%`;
    
    const nextNode = flatNodes.find(n => !getProgress().includes(n.id));
    const btn = document.getElementById('resume-btn');
    if (nextNode) {
        btn.href = `${nextNode.type}.html?id=${nextNode.id}`;
        btn.textContent = 'Lanjutkan Belajar';
    } else {
        btn.href = 'portfolio.html';
        btn.textContent = 'Lihat Portofolio';
    }
};

const renderRoadmap = () => {
    const container = document.getElementById('roadmap-container');
    const progress = getProgress();
    let currentFound = false;

    curriculum.modules.forEach(m => {
        const mod = document.createElement('div');
        mod.innerHTML = `<h3>${m.title}</h3>`;
        m.nodes.forEach(n => {
            const isDone = progress.includes(n.id);
            const isCurrent = !isDone && !currentFound;
            if (isCurrent) currentFound = true;
            
            const state = isDone ? 'completed' : (isCurrent ? 'current' : 'locked');
            const el = document.createElement('a');
            el.className = `node-card state-${state}`;
            el.href = state !== 'locked' ? `${n.type}.html?id=${n.id}` : '#';
            el.innerHTML = `<h4>${n.title}</h4><p>${state.toUpperCase()}</p>`;
            mod.appendChild(el);
        });
        container.appendChild(mod);
    });
};

const renderLesson = (node) => {
    document.getElementById('lesson-title').textContent = node.title;
    const cont = document.getElementById('lesson-content-container');
    node.contentBlocks.forEach(b => {
        const el = document.createElement('p');
        el.textContent = b.value;
        cont.appendChild(el);
    });

    if (node.knowledgeCheck) {
        const kc = document.getElementById('knowledge-check-container');
        kc.style.display = 'block';
        document.getElementById('kc-question').textContent = node.knowledgeCheck.question;
        node.knowledgeCheck.options.forEach((o, i) => {
            const btn = document.createElement('button');
            btn.textContent = o;
            btn.onclick = () => {
                if (i === node.knowledgeCheck.correctIndex) {
                    document.getElementById('complete-btn').style.display = 'block';
                    kc.innerHTML = '<p style="color:green">Benar!</p>';
                } else {
                    alert(node.knowledgeCheck.hint);
                }
            };
            document.getElementById('kc-options').appendChild(btn);
        });
    } else {
        document.getElementById('complete-btn').style.display = 'block';
    }
};

const renderProject = (node) => {
    document.getElementById('project-title').textContent = node.title;
    const form = document.getElementById('form-fields-container');
    node.template.fields.forEach(f => {
        const el = document.createElement(f.type === 'textarea' ? 'textarea' : 'input');
        el.id = f.id;
        el.placeholder = f.placeholder;
        form.appendChild(el);
    });
    document.getElementById('project-form').onsubmit = (e) => {
        e.preventDefault();
        const data = {};
        node.template.fields.forEach(f => data[f.label] = document.getElementById(f.id).value);
        saveProject({ nodeId: node.id, title: node.title, data });
        saveProgress(node.id);
        window.location.href = 'portfolio.html';
    };
};

// ==========================================
// 4. BOOTSTRAP
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('BOOT OK');
    console.log(window.location.pathname);
    await fetchCurriculum();
    const path = window.location.pathname;

    if (
    path === '/' ||
    path.includes('index.html')
) {
        document.getElementById('onboarding-form').onsubmit = (e) => {
            e.preventDefault();
            saveUser({ name: document.getElementById('user-name').value });
            window.location.href = 'dashboard.html';
        };
    } else if (path.includes('dashboard.html')) renderDashboard();
    else if (path.includes('roadmap.html')) renderRoadmap();
    else if (path.includes('lesson.html')) renderLesson(findNodeById(new URLSearchParams(window.location.search).get('id')));
    else if (path.includes('project.html')) renderProject(findNodeById(new URLSearchParams(window.location.search).get('id')));
    else if (path.includes('portfolio.html')) {
        const p = getProjects();
        document.getElementById('portfolio-container').innerHTML = p.length ? 
            p.map(x => `<div class="card"><h3>${x.title}</h3><pre>${JSON.stringify(x.data)}</pre></div>`).join('') : 'Belum ada proyek.';
    }
});
