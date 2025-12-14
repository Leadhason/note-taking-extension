// Storage keys
const STORAGE_KEY = 'quickNotes';

// DOM elements
const noteInput = document.getElementById('noteInput');
const addNoteBtn = document.getElementById('addNote');
const clearInputBtn = document.getElementById('clearInput');
const notesList = document.getElementById('notesList');
const noteCount = document.getElementById('noteCount');

// Load notes when page loads
document.addEventListener('DOMContentLoaded', () => {
    loadNotes();
    
    // Event listeners
    addNoteBtn.addEventListener('click', addNote);
    clearInputBtn.addEventListener('click', clearInput);
    
    // Allow Ctrl+Enter to save note
    noteInput.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            addNote();
        }
    });
});

// Load notes from Chrome storage
async function loadNotes() {
    try {
        const result = await chrome.storage.local.get([STORAGE_KEY]);
        const notes = result[STORAGE_KEY] || [];
        displayNotes(notes);
    } catch (error) {
        console.error('Error loading notes:', error);
    }
}

// Save notes to Chrome storage
async function saveNotes(notes) {
    try {
        await chrome.storage.local.set({ [STORAGE_KEY]: notes });
    } catch (error) {
        console.error('Error saving notes:', error);
    }
}

// Add a new note
async function addNote() {
    const text = noteInput.value.trim();
    
    if (!text) {
        noteInput.focus();
        return;
    }
    
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    const notes = result[STORAGE_KEY] || [];
    
    const newNote = {
        id: Date.now(),
        text: text,
        timestamp: new Date().toISOString(),
        dateFormatted: new Date().toLocaleString()
    };
    
    notes.unshift(newNote); // Add to beginning
    await saveNotes(notes);
    displayNotes(notes);
    clearInput();
}

// Delete a note
async function deleteNote(id) {
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    const notes = result[STORAGE_KEY] || [];
    
    const updatedNotes = notes.filter(note => note.id !== id);
    await saveNotes(updatedNotes);
    displayNotes(updatedNotes);
}

// Display all notes
function displayNotes(notes) {
    noteCount.textContent = notes.length;
    
    if (notes.length === 0) {
        notesList.innerHTML = '<p class="empty-state">No notes yet. Start writing!</p>';
        return;
    }
    
    notesList.innerHTML = notes.map(note => `
        <div class="note-card" data-id="${note.id}">
            <div class="note-content">${escapeHtml(note.text)}</div>
            <div class="note-footer">
                <span class="note-time">${note.dateFormatted}</span>
                <button class="delete-btn" onclick="deleteNote(${note.id})">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                        <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                    </svg>
                </button>
            </div>
        </div>
    `).join('');
}

// Clear input field
function clearInput() {
    noteInput.value = '';
    noteInput.focus();
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML.replace(/\n/g, '<br>');
}

// Make deleteNote available globally
window.deleteNote = deleteNote;