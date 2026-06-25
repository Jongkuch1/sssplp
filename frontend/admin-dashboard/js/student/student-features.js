// Student Dashboard Features - FR02, FR06, FR12
// Backed by the real API via window.Data; all methods that touch shared
// data are now async and must be awaited by callers.
const StudentFeatures = {
    // FR02: Adaptive Learning Engine
    async getRecommendations() {
        try {
            const me = JSON.parse(localStorage.getItem('currentUser') || '{}');
            const profiles = await Data.adaptive.getProfile(me.id);
            const list = Array.isArray(profiles) ? profiles : [];
            const weakSubjects = list.filter(p => p.performance < 0.6).map(p => p.subject);
            return weakSubjects.length ? weakSubjects : ['Mathematics', 'English Language'];
        } catch (error) {
            return ['Mathematics', 'English Language'];
        }
    },

    async calculateProgress() {
        const attempts = await Data.learning.getQuizAttempts();
        const total = attempts.length;
        const passed = attempts.filter(a => a.passed).length;
        return total ? Math.round((passed / total) * 100) : 0;
    },

    // FR04: Offline Download Manager - inherently per-device, stays in localStorage
    downloadContent(subjectId, content) {
        const downloads = JSON.parse(localStorage.getItem('downloadedAssets') || '[]');
        downloads.push({
            id: Date.now(),
            subjectId,
            content,
            downloadedAt: Date.now(),
            status: 'completed'
        });
        localStorage.setItem('downloadedAssets', JSON.stringify(downloads));
        Universal.showToast('Content downloaded for offline use', 'success');
    },

    getDownloadedContent() {
        return JSON.parse(localStorage.getItem('downloadedAssets') || '[]');
    },

    // FR12: Quiz Player
    async getQuizzes() {
        return await Data.learning.getQuizzes();
    },

    async getQuiz(quizId) {
        const quizzes = await Data.learning.getQuizzes();
        return quizzes.find(q => q._id === quizId) || quizzes[0];
    },

    startQuiz(quizId) {
        localStorage.setItem('currentQuiz', JSON.stringify({
            quizId,
            startTime: Date.now(),
            answers: {}
        }));
    },

    saveQuizAnswer(questionIndex, answer) {
        const current = JSON.parse(localStorage.getItem('currentQuiz') || '{}');
        current.answers = current.answers || {};
        current.answers[questionIndex] = answer;
        current.lastSaved = Date.now();
        localStorage.setItem('currentQuiz', JSON.stringify(current));
    },

    async submitQuiz() {
        const current = JSON.parse(localStorage.getItem('currentQuiz') || '{}');
        const answerEntries = Object.entries(current.answers || {})
            .sort((a, b) => Number(a[0]) - Number(b[0]));
        const answers = answerEntries.map(([, selectedAnswer]) => ({ selectedAnswer }));
        const timeSpent = current.startTime ? Math.round((Date.now() - current.startTime) / 60000) : 0;

        const attempt = await Data.learning.submitQuizAttempt({
            quizId: current.quizId,
            answers,
            timeSpent
        });

        localStorage.removeItem('currentQuiz');
        return attempt;
    },

    // FR05: Tutoring Booking
    async bookTutoring(teacherId, datetime, type) {
        const teachers = await Data.users.list();
        const teacher = teachers.find(t => t._id === teacherId);
        const me = JSON.parse(localStorage.getItem('currentUser') || '{}');

        const meeting = await Data.meetings.create({
            teacherId,
            teacherName: teacher ? teacher.name : 'Teacher',
            studentId: me.id,
            studentEmail: me.email,
            title: `${type} Tutoring Session`,
            subject: (teacher && teacher.subjects && teacher.subjects[0]) || 'General',
            type,
            datetime,
            meetLink: 'https://meet.google.com/zce-wnss-vvr'
        });

        Universal.showToast('Tutoring session booked', 'success');
        return meeting;
    },

    async getUpcomingSessions() {
        const me = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const meetings = await Data.meetings.listForStudent(me.id, me.email);
        return meetings.filter(m => new Date(m.datetime) > new Date());
    },

    // FR11: Student-Tutor Messaging
    async sendMessage(recipientId, message) {
        const me = JSON.parse(localStorage.getItem('currentUser') || '{}');
        return await Data.messages.send({ from: me.id, to: recipientId, text: message });
    },

    async getUnreadMessages() {
        const me = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (!me.id) return [];
        const messages = await Data.messages.getAllForUser(me.id);
        return messages.filter(m => (m.to?._id || m.to) === me.id && !m.read);
    }
};

// FR06: Progress Tracking
const ProgressTracker = {
    async updateProgress(moduleId, progressPercentage, status) {
        const result = await Data.learning.updateProgress({ moduleId, progressPercentage, status });
        Universal.logActivity('progress_update', { moduleId, progressPercentage, status });
        return result;
    },

    async getProgressData() {
        const [progress, attempts] = await Promise.all([
            Data.learning.getProgress(),
            Data.learning.getQuizAttempts()
        ]);

        return {
            overall: await StudentFeatures.calculateProgress(),
            subjects: progress,
            recentAttempts: attempts.slice(0, 5),
            timeSpent: this.calculateTimeSpent()
        };
    },

    calculateTimeSpent() {
        const logs = JSON.parse(localStorage.getItem('activityLogs') || '[]');
        const today = new Date().setHours(0, 0, 0, 0);
        const todayLogs = logs.filter(l => l.timestamp >= today);
        return todayLogs.length * 5; // Estimate 5 min per activity
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('student-dashboard')) {
        loadStudentDashboard();
    }
});

async function loadStudentDashboard() {
    const recommendations = await StudentFeatures.getRecommendations();
    const progress = await ProgressTracker.getProgressData();
    const upcoming = await StudentFeatures.getUpcomingSessions();

    // Update dashboard UI (timeSpent is owned by a live per-minute session timer
    // in student-dashboard.html's inline script, not duplicated here)
    document.getElementById('overallProgress').textContent = progress.overall + '%';

    // Recommendations
    const recContainer = document.getElementById('recommendations');
    if (recContainer) {
        const continueText = t('continueLearningSuggestion');
        const startText = t('start');
        recContainer.innerHTML = recommendations.map(subject => {
            const subjectName = t(subject.toLowerCase()) || subject;
            return `
                <div class="rec-card">
                    <h4>${subjectName}</h4>
                    <p>${continueText}</p>
                    <a href="subjects.html?subject=${subject}" class="btn-small">${startText}</a>
                </div>
            `;
        }).join('');
    }

    // Upcoming sessions
    const sessionsContainer = document.getElementById('upcomingSessions');
    if (sessionsContainer) {
        sessionsContainer.innerHTML = upcoming.length ? upcoming.map(s => `
            <div class="session-card">
                <div>
                    <strong>${s.teacherName || 'Tutor'}</strong>
                    <p>${new Date(s.datetime).toLocaleString()}</p>
                    <small>${s.type} session</small>
                </div>
                <a href="${s.meetLink}" class="btn-small" target="_blank">Join</a>
            </div>
        `).join('') : '<p>No upcoming sessions</p>';
    }
}
