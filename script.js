// Storage keys
const STORAGE_KEY = 'keepNotes';
const THEME_KEY = 'keepNoteTheme';

// DOM elements
const homeView = document.getElementById('homeView');
const editorView = document.getElementById('editorView');
const notesList = document.getElementById('notesList');
const fab = document.getElementById('fab');
const backBtn = document.getElementById('backBtn');
const saveNoteBtn = document.getElementById('saveNoteBtn');
const deleteNoteBtn = document.getElementById('deleteNoteBtn');
const noteTitleInput = document.getElementById('noteTitle');
const noteContentInput = document.getElementById('noteContent');
const searchInput = document.getElementById('searchInput');
const themeToggle = document.getElementById('themeToggle');
const breadcrumbTitle = document.getElementById('breadcrumbTitle');
const colorDots = document.querySelectorAll('.color-dot');

let currentNoteId = null;
let selectedColor = '#3f51b5';
let allNotes = [];

// Load notes when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadTheme();
    loadNotes();
    
    // Event listeners
    fab.addEventListener('click', () => openEditor());
    backBtn.addEventListener('click', goToHome);
    saveNoteBtn.addEventListener('click', saveNote);
    deleteNoteBtn.addEventListener('click', () => {
        if (currentNoteId) {
            deleteNote(currentNoteId);
        }
    });
    searchInput.addEventListener('input', handleSearch);
    themeToggle.addEventListener('click', toggleTheme);
    
    // Click handler for note cards (event delegation)
    notesList.addEventListener('click', (e) => {
        const noteCard = e.target.closest('.note-card');
        if (noteCard) {
            const noteId = parseInt(noteCard.dataset.id);
            openEditor(noteId);
        }
    });
    
    // Color picker
    colorDots.forEach(dot => {
        dot.addEventListener('click', () => {
            colorDots.forEach(d => d.classList.remove('active'));
            dot.classList.add('active');
            selectedColor = dot.dataset.color;
        });
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && editorView.classList.contains('active')) {
            goToHome();
        }
    });
});

// Theme functions
async function loadTheme() {
    try {
        const result = await chrome.storage.local.get([THEME_KEY]);
        const theme = result[THEME_KEY] || 'light';
        document.body.setAttribute('data-theme', theme);
    } catch (error) {
        console.error('Error loading theme:', error);
    }
}

async function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    document.body.setAttribute('data-theme', newTheme);
    await chrome.storage.local.set({ [THEME_KEY]: newTheme });
}

// Navigation functions
function openEditor(noteId = null) {
    currentNoteId = noteId;
    homeView.classList.remove('active');
    editorView.classList.add('active');
    
    if (noteId) {
        // Edit existing note
        const note = allNotes.find(n => n.id === noteId);
        if (note) {
            noteTitleInput.value = note.title;
            noteContentInput.value = note.content;
            selectedColor = note.color;
            breadcrumbTitle.textContent = note.title || 'Untitled';
            deleteNoteBtn.style.display = 'flex';
            colorDots.forEach(dot => {
                dot.classList.toggle('active', dot.dataset.color === note.color);
            });
        }
    } else {
        // New note
        noteTitleInput.value = '';
        noteContentInput.value = '';
        selectedColor = '#3f51b5';
        breadcrumbTitle.textContent = 'New Note';
        deleteNoteBtn.style.display = 'none';
        colorDots.forEach((dot, index) => {
            dot.classList.toggle('active', index === 1);
        });
    }
    
    setTimeout(() => noteTitleInput.focus(), 100);
}

function goToHome() {
    editorView.classList.remove('active');
    homeView.classList.add('active');
    currentNoteId = null;
}

// Load notes from Chrome storage
async function loadNotes() {
    try {
        const result = await chrome.storage.local.get([STORAGE_KEY]);
        allNotes = result[STORAGE_KEY] || [];
        displayNotes(allNotes);
    } catch (error) {
        console.error('Error loading notes:', error);
    }
}

// Save notes to Chrome storage
async function saveNotes(notes) {
    try {
        await chrome.storage.local.set({ [STORAGE_KEY]: notes });
        allNotes = notes;
    } catch (error) {
        console.error('Error saving notes:', error);
    }
}

// Save a note
async function saveNote() {
    const title = noteTitleInput.value.trim();
    const content = noteContentInput.value.trim();
    
    if (!title && !content) {
        return;
    }
    
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    const notes = result[STORAGE_KEY] || [];
    
    if (currentNoteId) {
        // Edit existing note
        const index = notes.findIndex(n => n.id === currentNoteId);
        if (index !== -1) {
            notes[index] = {
                ...notes[index],
                title: title || 'Untitled',
                content: content,
                color: selectedColor,
                updatedAt: new Date().toISOString()
            };
        }
    } else {
        // Create new note
        const newNote = {
            id: Date.now(),
            title: title || 'Untitled',
            content: content,
            color: selectedColor,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        notes.unshift(newNote);
    }
    
    await saveNotes(notes);
    displayNotes(notes);
    goToHome();
}

// Delete a note
async function deleteNote(id) {
    if (!confirm('Delete this note?')) return;
    
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    const notes = result[STORAGE_KEY] || [];
    
    const updatedNotes = notes.filter(note => note.id !== id);
    await saveNotes(updatedNotes);
    displayNotes(updatedNotes);
    goToHome();
}

// Display all notes
function displayNotes(notes) {
    if (notes.length === 0) {
        notesList.innerHTML = '<p class="empty-state">No notes yet. Click the + button to start!</p>';
        return;
    }
    
    notesList.innerHTML = notes.map(note => {
        const preview = note.content.substring(0, 80);
        return `
            <div class="note-card" data-id="${note.id}">
                <h3 class="note-title">${escapeHtml(note.title)}</h3>
                <p class="note-preview">${escapeHtml(preview)}${note.content.length > 80 ? '...' : ''}</p>
                <div class="note-footer">
                    <span class="color-indicator" style="background: ${note.color};"></span>
                </div>
            </div>
        `;
    }).join('');
}

// Search functionality
function handleSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    
    if (!query) {
        displayNotes(allNotes);
        return;
    }
    
    const filtered = allNotes.filter(note => 
        note.title.toLowerCase().includes(query) || 
        note.content.toLowerCase().includes(query)
    );
    
    displayNotes(filtered);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}