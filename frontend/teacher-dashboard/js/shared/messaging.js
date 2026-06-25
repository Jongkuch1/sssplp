// Messaging System
let currentChat = null;
let cachedUsers = [];

document.addEventListener('DOMContentLoaded', async function() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    if (!currentUser.email) {
        window.location.href = 'login.html';
        return;
    }

    await loadContacts();
});

async function loadContacts() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    cachedUsers = await Data.users.list();

    // Get contacts based on role
    let contacts = [];
    if (currentUser.role === 'student') {
        contacts = cachedUsers.filter(u => u.role === 'teacher');
    } else if (currentUser.role === 'teacher') {
        contacts = cachedUsers.filter(u => u.role === 'student');
    } else {
        contacts = cachedUsers.filter(u => u.email !== currentUser.email);
    }

    const container = document.getElementById('contactsList');
    container.innerHTML = contacts.map(contact => `
        <div class="contact-item" onclick="openChat('${contact._id}')">
            <i class="fas fa-user-circle" style="font-size: 2rem; color: #2563eb;"></i>
            <div style="flex: 1; margin-left: 10px;">
                <strong>${contact.name}</strong>
                <p style="margin: 0; color: #64748b; font-size: 0.9rem;">${contact.role}</p>
            </div>
        </div>
    `).join('');
}

async function openChat(contactId) {
    const contact = cachedUsers.find(u => u._id === contactId);

    currentChat = contactId;

    document.getElementById('chatHeader').innerHTML = `
        <i class="fas fa-user-circle" style="font-size: 1.5rem; color: #2563eb;"></i>
        <h3 style="margin: 0 0 0 10px;">${contact.name}</h3>
    `;

    document.getElementById('messageInput').style.display = 'flex';
    await loadMessages(contactId);
}

async function loadMessages(contactId) {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const chatMessages = await Data.messages.getConversation(currentUser.id, contactId);

    const container = document.getElementById('messagesContainer');
    container.innerHTML = chatMessages.map(msg => `
        <div class="message ${(msg.from?._id || msg.from) === currentUser.id ? 'sent' : 'received'}">
            <p style="margin: 0;">${msg.text}</p>
            <small style="opacity: 0.7;">${new Date(msg.timestamp).toLocaleTimeString()}</small>
        </div>
    `).join('');

    container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const messageText = document.getElementById('messageText').value.trim();

    if (!messageText || !currentChat) return;

    await Data.messages.send({ from: currentUser.id, to: currentChat, text: messageText });

    document.getElementById('messageText').value = '';
    await loadMessages(currentChat);

    // Send notification to recipient
    await Data.notifications.send({
        userId: currentChat,
        type: 'message',
        message: `New message from ${currentUser.name}`,
        channel: 'in-app',
        link: 'messaging.html'
    });
}

// Send message on Enter key
document.addEventListener('keypress', function(e) {
    if (e.key === 'Enter' && document.getElementById('messageText') === document.activeElement) {
        sendMessage();
    }
});
