// Teacher Dashboard Features - FR05, FR06, FR10, FR12
// Backed by the real API via window.Data; all methods that touch shared
// data are now async and must be awaited by callers.
const TeacherFeatures = {
    // FR10: Course Management
    async createCourse(courseData) {
        const course = await Data.courses.create(courseData);
        Universal.showToast('Course created', 'success');
        return course;
    },

    async updateCourse(courseId, updates) {
        const course = await Data.courses.update(courseId, updates);
        Universal.showToast('Course updated', 'success');
        return course;
    },

    async getCourses() {
        return await Data.courses.list({ mine: 'true' });
    },

    // FR10: Resource Upload — no backend file-storage model exists yet (link/metadata
    // only); intentionally left on localStorage until a storage strategy is decided.
    uploadResource(file, metadata, onProgress) {
        return new Promise((resolve, reject) => {
            const chunkSize = 1024 * 1024; // 1MB chunks
            const chunks = Math.ceil(file.size / chunkSize);
            let uploadedChunks = 0;

            const upload = () => {
                if (!navigator.onLine) {
                    this.queueUpload(file, metadata);
                    reject('Offline - queued for retry');
                    return;
                }

                // Simulate chunked upload
                const interval = setInterval(() => {
                    uploadedChunks++;
                    const progress = Math.round((uploadedChunks / chunks) * 100);
                    onProgress?.(progress);

                    if (uploadedChunks >= chunks) {
                        clearInterval(interval);
                        const resource = this.saveResource(file, metadata);
                        resolve(resource);
                    }
                }, 100);
            };

            upload();
        });
    },

    saveResource(file, metadata) {
        const resources = JSON.parse(localStorage.getItem('resources') || '[]');
        const resource = {
            id: Date.now(),
            name: file.name,
            type: file.type,
            size: file.size,
            ...metadata,
            status: 'pending_approval',
            uploadedAt: Date.now()
        };
        resources.push(resource);
        localStorage.setItem('resources', JSON.stringify(resources));
        Universal.logActivity('resource_upload', { resourceId: resource.id });
        return resource;
    },

    queueUpload(file, metadata) {
        const queue = JSON.parse(localStorage.getItem('uploadQueue') || '[]');
        queue.push({ file: file.name, metadata, timestamp: Date.now() });
        localStorage.setItem('uploadQueue', JSON.stringify(queue));
    },

    retryUploads() {
        const queue = JSON.parse(localStorage.getItem('uploadQueue') || '[]');
        if (queue.length && navigator.onLine) {
            Universal.showToast('Retrying uploads...', 'info');
            localStorage.setItem('uploadQueue', '[]');
        }
    },

    getResources() {
        return JSON.parse(localStorage.getItem('resources') || '[]');
    },

    // FR12: Assignment Builder
    async createAssignment(assignmentData) {
        const assignment = await Data.assignments.create(assignmentData);
        Universal.showToast('Assignment created', 'success');
        return assignment;
    },

    async getAssignments() {
        return await Data.assignments.list({ mine: 'true' });
    },

    // FR12: Grading
    async gradeSubmission(submissionId, grade, comments) {
        const submission = await Data.submissions.grade(submissionId, { grade, comments });
        Universal.showToast('Submission graded', 'success');
        return submission;
    },

    async bulkGrade(submissionIds, grade) {
        await Promise.all(submissionIds.map(id => this.gradeSubmission(id, grade, 'Bulk graded')));
        Universal.showToast(`${submissionIds.length} submissions graded`, 'success');
    },

    async getSubmissions(assignmentId) {
        return await Data.submissions.getForAssignment(assignmentId);
    },

    // FR06: Student Progress View
    async getStudentProgress(studentId) {
        const [attempts, submissions] = await Promise.all([
            Data.learning.getQuizAttempts({ studentId }),
            Data.submissions.getForStudent(studentId)
        ]);

        return {
            quizzes: attempts,
            assignments: submissions,
            avgScore: this.calculateAverage(attempts),
            completion: this.calculateCompletion(submissions)
        };
    },

    async getClassSummary() {
        const [users, attempts] = await Promise.all([
            Data.users.list(),
            Data.learning.getQuizAttempts({ all: 'true' })
        ]);
        const students = users.filter(u => u.role === 'student');

        return {
            totalStudents: students.length,
            activeStudents: new Set(attempts.map(a => a.userId?._id || a.userId)).size,
            avgClassScore: this.calculateAverage(attempts),
            totalAttempts: attempts.length
        };
    },

    calculateAverage(attempts) {
        if (!attempts.length) return 0;
        const sum = attempts.reduce((acc, a) => acc + (a.score || 0), 0);
        return Math.round(sum / attempts.length);
    },

    calculateCompletion(submissions) {
        if (!submissions.length) return 0;
        const completed = submissions.filter(s => s.status === 'graded').length;
        return Math.round((completed / submissions.length) * 100);
    },

    // FR05: Tutoring Schedule Management — "available slots" has no backend model
    // (Meeting only stores actual scheduled meetings), intentionally left local.
    setAvailability(slots) {
        const availability = JSON.parse(localStorage.getItem('teacherAvailability') || '{}');
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        availability[user.email] = slots;
        localStorage.setItem('teacherAvailability', JSON.stringify(availability));
        Universal.showToast('Availability updated', 'success');
    },

    getAvailability() {
        const availability = JSON.parse(localStorage.getItem('teacherAvailability') || '{}');
        const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
        return availability[user.email] || [];
    },

    async getBookings() {
        const me = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const meetings = await Data.meetings.list();
        return meetings.filter(m => (m.teacherId?._id || m.teacherId) === me.id);
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('teacher-dashboard')) {
        loadTeacherDashboard();
    }

    // Retry uploads on reconnect
    window.addEventListener('online', () => TeacherFeatures.retryUploads());
});

async function loadTeacherDashboard() {
    const summary = await TeacherFeatures.getClassSummary();
    const courses = await TeacherFeatures.getCourses();
    const bookings = await TeacherFeatures.getBookings();

    document.getElementById('totalStudents').textContent = summary.totalStudents;
    document.getElementById('activeStudents').textContent = summary.activeStudents;
    document.getElementById('avgClassScore').textContent = summary.avgClassScore + '%';
    document.getElementById('totalCourses').textContent = courses.length;

    // Upcoming sessions
    const upcoming = bookings.filter(b => new Date(b.datetime) > new Date());
    const sessionsContainer = document.getElementById('upcomingSessions');
    if (sessionsContainer) {
        sessionsContainer.innerHTML = upcoming.length ? upcoming.slice(0, 3).map(s => `
            <div class="session-card">
                <p>${new Date(s.datetime).toLocaleString()}</p>
                <span class="badge">${s.type}</span>
            </div>
        `).join('') : '<p>No upcoming sessions</p>';
    }
}
