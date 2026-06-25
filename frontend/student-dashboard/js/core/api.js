// API Configuration
const API_URL = window.location.hostname === 'localhost'
    ? 'http://localhost:5000/api'
    : '/api'; // Use same domain (Vercel deployment)

function buildQuery(params) {
    if (!params) return '';
    const qs = new URLSearchParams(params).toString();
    return qs ? `?${qs}` : '';
}

async function apiRequest(path, { method = 'GET', token, body } = {}) {
    const headers = {};
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_URL}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `Request failed: ${path}`);
    }
    return response.json();
}

// API Client
const API = {
    // Check if backend is available
    async checkBackend() {
        try {
            const response = await fetch(`${API_URL}/health`);
            return response.ok;
        } catch (error) {
            return false;
        }
    },

    // Auth endpoints
    auth: {
        async register(userData) {
            return apiRequest('/auth/register', { method: 'POST', body: userData });
        },

        async login(credentials) {
            return apiRequest('/auth/login', { method: 'POST', body: credentials });
        },

        async getProfile(token) {
            return apiRequest('/auth/me', { token });
        }
    },

    // User endpoints
    users: {
        async getAll(token) {
            return apiRequest('/users', { token });
        },

        async getById(id, token) {
            return apiRequest(`/users/${id}`, { token });
        },

        async create(data, token) {
            return apiRequest('/users', { method: 'POST', token, body: data });
        },

        async update(id, data, token) {
            return apiRequest(`/users/${id}`, { method: 'PUT', token, body: data });
        }
    },

    // Course endpoints
    courses: {
        async getAll(token, query) {
            return apiRequest(`/courses${buildQuery(query)}`, { token });
        },

        async create(courseData, token) {
            return apiRequest('/courses', { method: 'POST', token, body: courseData });
        },

        async update(id, data, token) {
            return apiRequest(`/courses/${id}`, { method: 'PUT', token, body: data });
        },

        async setStatus(id, status, token) {
            return apiRequest(`/courses/${id}/status`, { method: 'PUT', token, body: { status } });
        }
    },

    // Quiz endpoints (authoring + approval workflow)
    quizzes: {
        async getAll(token, query) {
            return apiRequest(`/quizzes${buildQuery(query)}`, { token });
        },

        async create(quizData, token) {
            return apiRequest('/quizzes', { method: 'POST', token, body: quizData });
        },

        async update(id, data, token) {
            return apiRequest(`/quizzes/${id}`, { method: 'PUT', token, body: data });
        },

        async setStatus(id, status, token) {
            return apiRequest(`/quizzes/${id}/status`, { method: 'PUT', token, body: { status } });
        }
    },

    // Assignment endpoints
    assignments: {
        async getAll(token, query) {
            return apiRequest(`/assignments${buildQuery(query)}`, { token });
        },

        async create(assignmentData, token) {
            return apiRequest('/assignments', { method: 'POST', token, body: assignmentData });
        },

        async update(id, data, token) {
            return apiRequest(`/assignments/${id}`, { method: 'PUT', token, body: data });
        },

        async setStatus(id, status, token) {
            return apiRequest(`/assignments/${id}/status`, { method: 'PUT', token, body: { status } });
        }
    },

    // Meeting endpoints (FR05)
    meetings: {
        async getAll(token) {
            return apiRequest('/meetings', { token });
        },

        async getForStudent(studentId, email, token) {
            return apiRequest(`/meetings/student/${studentId}?email=${encodeURIComponent(email)}`, { token });
        },

        async create(meetingData, token) {
            return apiRequest('/meetings', { method: 'POST', token, body: meetingData });
        },

        async update(id, data, token) {
            return apiRequest(`/meetings/${id}`, { method: 'PUT', token, body: data });
        },

        async remove(id, token) {
            return apiRequest(`/meetings/${id}`, { method: 'DELETE', token });
        }
    },

    // Message endpoints (FR11)
    messages: {
        async getConversation(userId1, userId2, token) {
            return apiRequest(`/messages?userId1=${userId1}&userId2=${userId2}`, { token });
        },

        async getAllForUser(userId, token) {
            return apiRequest(`/messages/conversations/${userId}`, { token });
        },

        async send(messageData, token) {
            return apiRequest('/messages', { method: 'POST', token, body: messageData });
        },

        async markRead(id, token) {
            return apiRequest(`/messages/${id}/read`, { method: 'PUT', token });
        }
    },

    // Adaptive learning endpoints (FR02)
    adaptive: {
        async getProfile(studentId, token, subject) {
            const path = subject ? `/adaptive/${studentId}/${subject}` : `/adaptive/${studentId}`;
            return apiRequest(path, { token });
        },

        async updateProfile(profileData, token) {
            return apiRequest('/adaptive', { method: 'POST', token, body: profileData });
        }
    },

    // Reports endpoints (FR07)
    reports: {
        async getStudentReport(studentId, token) {
            return apiRequest(`/reports/student/${studentId}`, { token });
        }
    },

    // Notification endpoints (FR09)
    notifications: {
        async send(notificationData, token) {
            return apiRequest('/notifications/send', { method: 'POST', token, body: notificationData });
        },

        async list(userId, token) {
            return apiRequest(`/notifications/${userId}`, { token });
        },

        async markRead(id, token) {
            return apiRequest(`/notifications/${id}/read`, { method: 'PUT', token });
        }
    },

    // Learning endpoints: modules, quiz-taking, progress (FR02, FR06, FR12)
    learning: {
        async getModules(token, query) {
            return apiRequest(`/learning/modules${buildQuery(query)}`, { token });
        },

        async getModulesBySubject(subject, token) {
            return apiRequest(`/learning/modules/subject/${subject}`, { token });
        },

        async createModule(data, token) {
            return apiRequest('/learning/modules', { method: 'POST', token, body: data });
        },

        async getQuizzes(token, query) {
            return apiRequest(`/learning/quizzes${buildQuery(query)}`, { token });
        },

        async createQuiz(data, token) {
            return apiRequest('/learning/quizzes', { method: 'POST', token, body: data });
        },

        async getProgress(token) {
            return apiRequest('/learning/progress', { token });
        },

        async updateProgress(data, token) {
            return apiRequest('/learning/progress', { method: 'POST', token, body: data });
        },

        async submitQuizAttempt(data, token) {
            return apiRequest('/learning/quiz-attempts', { method: 'POST', token, body: data });
        },

        async getQuizAttempts(token, query) {
            return apiRequest(`/learning/quiz-attempts${buildQuery(query)}`, { token });
        }
    },

    // Assignment submissions & grading
    submissions: {
        async submit(data, token) {
            return apiRequest('/submissions', { method: 'POST', token, body: data });
        },

        async getForAssignment(assignmentId, token) {
            return apiRequest(`/submissions/assignment/${assignmentId}`, { token });
        },

        async getForStudent(studentId, token) {
            return apiRequest(`/submissions/student/${studentId}`, { token });
        },

        async grade(id, data, token) {
            return apiRequest(`/submissions/${id}/grade`, { method: 'PUT', token, body: data });
        }
    },

    // Admin audit log
    auditLogs: {
        async log(data, token) {
            return apiRequest('/audit-logs', { method: 'POST', token, body: data });
        },

        async list(token, query) {
            return apiRequest(`/audit-logs${buildQuery(query)}`, { token });
        }
    }
};

// Make API available globally
window.API = API;
