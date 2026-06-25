// Thin data-repository layer: calls the real API, caches the result in
// localStorage, and falls back to that cache only if the API call fails
// (offline / backend unreachable). Feature code should call Data.*, not
// localStorage, directly.
function getToken() {
    return localStorage.getItem('token');
}

async function withCache(apiCall, cacheKey, fallback) {
    try {
        const result = await apiCall();
        if (cacheKey) localStorage.setItem(cacheKey, JSON.stringify(result));
        return result;
    } catch (error) {
        console.warn(`Data: API call failed${cacheKey ? ` for ${cacheKey}` : ''}, using cached data`, error.message);
        if (!cacheKey) throw error;
        return JSON.parse(localStorage.getItem(cacheKey) || fallback);
    }
}

const Data = {
    courses: {
        list(query) {
            const key = query ? null : 'courses';
            return withCache(() => API.courses.getAll(getToken(), query), key, '[]');
        },
        create(data) {
            return withCache(() => API.courses.create(data, getToken()));
        },
        update(id, data) {
            return withCache(() => API.courses.update(id, data, getToken()));
        },
        setStatus(id, status) {
            return withCache(() => API.courses.setStatus(id, status, getToken()));
        }
    },

    quizzes: {
        list(query) {
            const key = query ? null : 'quizzes';
            return withCache(() => API.quizzes.getAll(getToken(), query), key, '[]');
        },
        create(data) {
            return withCache(() => API.quizzes.create(data, getToken()));
        },
        update(id, data) {
            return withCache(() => API.quizzes.update(id, data, getToken()));
        },
        setStatus(id, status) {
            return withCache(() => API.quizzes.setStatus(id, status, getToken()));
        }
    },

    assignments: {
        list(query) {
            const key = query ? null : 'assignments';
            return withCache(() => API.assignments.getAll(getToken(), query), key, '[]');
        },
        create(data) {
            return withCache(() => API.assignments.create(data, getToken()));
        },
        update(id, data) {
            return withCache(() => API.assignments.update(id, data, getToken()));
        },
        setStatus(id, status) {
            return withCache(() => API.assignments.setStatus(id, status, getToken()));
        }
    },

    submissions: {
        submit(data) {
            return withCache(() => API.submissions.submit(data, getToken()));
        },
        getForAssignment(assignmentId) {
            return withCache(() => API.submissions.getForAssignment(assignmentId, getToken()), null, '[]');
        },
        getForStudent(studentId) {
            return withCache(() => API.submissions.getForStudent(studentId, getToken()), null, '[]');
        },
        grade(id, data) {
            return withCache(() => API.submissions.grade(id, data, getToken()));
        }
    },

    auditLogs: {
        log(data) {
            return withCache(() => API.auditLogs.log(data, getToken()));
        },
        list(query) {
            return withCache(() => API.auditLogs.list(getToken(), query), null, '[]');
        }
    },

    meetings: {
        list() {
            return withCache(() => API.meetings.getAll(getToken()), 'meetings', '[]');
        },
        listForStudent(studentId, email) {
            return withCache(() => API.meetings.getForStudent(studentId, email, getToken()), 'meetings', '[]');
        },
        create(data) {
            return withCache(() => API.meetings.create(data, getToken()));
        },
        update(id, data) {
            return withCache(() => API.meetings.update(id, data, getToken()));
        },
        remove(id) {
            return withCache(() => API.meetings.remove(id, getToken()));
        }
    },

    messages: {
        getConversation(userId1, userId2) {
            return withCache(() => API.messages.getConversation(userId1, userId2, getToken()), null, '[]');
        },
        getAllForUser(userId) {
            return withCache(() => API.messages.getAllForUser(userId, getToken()), null, '[]');
        },
        send(data) {
            return withCache(() => API.messages.send(data, getToken()));
        },
        markRead(id) {
            return withCache(() => API.messages.markRead(id, getToken()));
        }
    },

    adaptive: {
        getProfile(studentId, subject) {
            return withCache(() => API.adaptive.getProfile(studentId, getToken(), subject), null, 'null');
        },
        updateProfile(data) {
            return withCache(() => API.adaptive.updateProfile(data, getToken()));
        }
    },

    reports: {
        getStudentReport(studentId) {
            return withCache(() => API.reports.getStudentReport(studentId, getToken()), null, 'null');
        }
    },

    notifications: {
        list(userId) {
            return withCache(() => API.notifications.list(userId, getToken()), null, '{"notifications":[]}');
        },
        send(data) {
            return withCache(() => API.notifications.send(data, getToken()));
        },
        markRead(id) {
            return withCache(() => API.notifications.markRead(id, getToken()));
        }
    },

    users: {
        list() {
            return withCache(() => API.users.getAll(getToken()), 'users', '[]');
        },
        create(data) {
            return withCache(() => API.users.create(data, getToken()));
        },
        update(id, data) {
            return withCache(() => API.users.update(id, data, getToken()));
        }
    },

    learning: {
        getModules(query) {
            return withCache(() => API.learning.getModules(getToken(), query), null, '[]');
        },
        createModule(data) {
            return withCache(() => API.learning.createModule(data, getToken()));
        },
        getQuizzes(query) {
            return withCache(() => API.learning.getQuizzes(getToken(), query), 'learningQuizzes', '[]');
        },
        createQuiz(data) {
            return withCache(() => API.learning.createQuiz(data, getToken()));
        },
        getProgress() {
            return withCache(() => API.learning.getProgress(getToken()), 'learningProgress', '[]');
        },
        updateProgress(data) {
            return withCache(() => API.learning.updateProgress(data, getToken()));
        },
        submitQuizAttempt(data) {
            return withCache(() => API.learning.submitQuizAttempt(data, getToken()));
        },
        getQuizAttempts(query) {
            const key = query ? null : 'quizAttempts';
            return withCache(() => API.learning.getQuizAttempts(getToken(), query), key, '[]');
        }
    }
};

window.Data = Data;
