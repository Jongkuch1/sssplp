// Global Data Synchronization System - Fetches real data from backend
class DataSync {
    constructor() {
        this.backendAvailable = false;
        this.checkBackend();
    }

    async checkBackend() {
        const backendUrl = window.location.hostname === 'localhost'
            ? 'http://localhost:5000/api/health'
            : '/api/health';
        try {
            const response = await fetch(backendUrl);
            this.backendAvailable = response.ok;
            console.log(this.backendAvailable ? '✅ Backend connected - Using real database' : '⚠️ Backend offline - Using localStorage');
        } catch {
            this.backendAvailable = false;
            console.log('⚠️ Backend offline - Using localStorage');
        }
    }

    async syncAllData() {
        const token = localStorage.getItem('token');
        if (!this.backendAvailable || !window.API || !token) {
            console.log('Using localStorage data');
            return;
        }

        try {
            // Sync users from database
            const users = await API.users.getAll(token);
            localStorage.setItem('users', JSON.stringify(users));
            console.log(`✅ Synced ${users.length} users from database`);

            // Sync courses
            const courses = await API.courses.getAll(token);
            localStorage.setItem('courses', JSON.stringify(courses));
            console.log(`✅ Synced ${courses.length} courses from database`);

            // Sync quizzes
            const quizzes = await API.quizzes.getAll(token);
            localStorage.setItem('quizzes', JSON.stringify(quizzes));
            console.log(`✅ Synced ${quizzes.length} quizzes from database`);

            // Sync assignments
            const assignments = await API.assignments.getAll(token);
            localStorage.setItem('assignments', JSON.stringify(assignments));
            console.log(`✅ Synced ${assignments.length} assignments from database`);

            localStorage.setItem('lastSync', Date.now().toString());
        } catch (error) {
            console.error('Sync error:', error);
        }
    }

    async getUserData() {
        const token = localStorage.getItem('token');
        if (this.backendAvailable && window.API && token) {
            try {
                return await API.users.getAll(token);
            } catch (error) {
                console.error('Failed to fetch users:', error);
            }
        }
        return JSON.parse(localStorage.getItem('users') || '[]');
    }

    async getCourseData() {
        const token = localStorage.getItem('token');
        if (this.backendAvailable && window.API && token) {
            try {
                return await API.courses.getAll(token);
            } catch (error) {
                console.error('Failed to fetch courses:', error);
            }
        }
        return JSON.parse(localStorage.getItem('courses') || '[]');
    }

    async getQuizData() {
        const token = localStorage.getItem('token');
        if (this.backendAvailable && window.API && token) {
            try {
                return await API.quizzes.getAll(token);
            } catch (error) {
                console.error('Failed to fetch quizzes:', error);
            }
        }
        return JSON.parse(localStorage.getItem('quizzes') || '[]');
    }

    async getAssignmentData() {
        const token = localStorage.getItem('token');
        if (this.backendAvailable && window.API && token) {
            try {
                return await API.assignments.getAll(token);
            } catch (error) {
                console.error('Failed to fetch assignments:', error);
            }
        }
        return JSON.parse(localStorage.getItem('assignments') || '[]');
    }
}

// Initialize global data sync
window.dataSync = new DataSync();

// Auto-sync on page load
document.addEventListener('DOMContentLoaded', async () => {
    if (localStorage.getItem('token')) {
        await window.dataSync.syncAllData();
    }
});
