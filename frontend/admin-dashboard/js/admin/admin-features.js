// Admin Dashboard Features - FR01, FR07, FR09, FR10, FR13, FR14
// Backed by the real API via window.Data; all methods that touch shared
// data are now async and must be awaited by callers.
const AdminFeatures = {
    // FR13: System Health & Usage Overview
    async getSystemHealth() {
        const dayAgo = Date.now() - 86400000;
        const [users, pendingCourses, pendingQuizzes, pendingAssignments] = await Promise.all([
            Data.users.list(),
            Data.courses.list({ status: 'pending' }),
            Data.quizzes.list({ status: 'pending' }),
            Data.assignments.list({ status: 'pending' })
        ]);

        let activeUsers = 0;
        try {
            const logs = await Data.auditLogs.list({ startDate: String(dayAgo) });
            activeUsers = new Set(logs.map(l => l.userEmail)).size;
        } catch (error) {
            activeUsers = 0;
        }

        return {
            totalUsers: users.length,
            activeUsers,
            uptime: 99.9,
            responseTime: Math.random() * 100 + 50,
            storageUsed: this.calculateStorage(),
            pendingApprovals: pendingCourses.length + pendingQuizzes.length + pendingAssignments.length
        };
    },

    calculateStorage() {
        let total = 0;
        for (let key in localStorage) {
            if (localStorage.hasOwnProperty(key)) {
                total += localStorage[key].length + key.length;
            }
        }
        return (total / 1024).toFixed(2) + ' KB';
    },

    // FR01: User Management
    async createUser(userData) {
        const user = await Data.users.create(userData);
        this.logAudit('user_created', { userId: user._id, email: user.email });
        Universal.showToast('User created', 'success');
        return user;
    },

    async updateUser(userId, updates) {
        const user = await Data.users.update(userId, updates);
        this.logAudit('user_updated', { userId, updates });
        Universal.showToast('User updated', 'success');
        return user;
    },

    async deactivateUser(userId) {
        await this.updateUser(userId, { status: 'inactive' });
        this.logAudit('user_deactivated', { userId });
    },

    async bulkImportUsers(csvData) {
        const lines = csvData.split('\n').slice(1);
        let imported = 0;

        for (const line of lines) {
            const [name, email, role, grade] = line.split(',');
            if (email && role) {
                try {
                    await this.createUser({ name, email, role, grade });
                    imported++;
                } catch (error) {
                    console.warn(`Failed to import ${email}:`, error.message);
                }
            }
        }

        Universal.showToast(`${imported} users imported`, 'success');
        return imported;
    },

    async exportUsers() {
        const users = await Data.users.list();
        const csv = 'Name,Email,Role,Grade,Status\n' +
            users.map(u => `${u.name},${u.email},${u.role},${u.grade || ''},${u.status || 'active'}`).join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users_${Date.now()}.csv`;
        a.click();

        this.logAudit('users_exported', { count: users.length });
    },

    // FR10: Content Approval — generic file/resource library has no backend model yet
    // (only courses/quizzes/assignments have a real approval workflow, handled separately).
    getPendingContent() {
        const resources = JSON.parse(localStorage.getItem('resources') || '[]');
        return resources.filter(r => r.status === 'pending_approval');
    },

    approveContent(resourceId) {
        const resources = JSON.parse(localStorage.getItem('resources') || '[]');
        const index = resources.findIndex(r => r.id == resourceId);
        if (index !== -1) {
            resources[index].status = 'approved';
            resources[index].approvedAt = Date.now();
            localStorage.setItem('resources', JSON.stringify(resources));
            this.logAudit('content_approved', { resourceId });
            Universal.showToast('Content approved', 'success');
        }
    },

    rejectContent(resourceId, reason) {
        const resources = JSON.parse(localStorage.getItem('resources') || '[]');
        const index = resources.findIndex(r => r.id == resourceId);
        if (index !== -1) {
            resources[index].status = 'rejected';
            resources[index].rejectionReason = reason;
            localStorage.setItem('resources', JSON.stringify(resources));
            this.logAudit('content_rejected', { resourceId, reason });
            Universal.showToast('Content rejected', 'success');
        }
    },

    // FR07: Reports Generator
    async generateReport(type, period) {
        const data = await this.getReportData(type, period);
        const report = {
            id: Date.now(),
            type,
            period,
            generatedAt: Date.now(),
            data
        };

        const reports = JSON.parse(localStorage.getItem('reports') || '[]');
        reports.push(report);
        localStorage.setItem('reports', JSON.stringify(reports));

        this.logAudit('report_generated', { type, period });
        return report;
    },

    async getReportData(type, period) {
        const periodMs = period === 'monthly' ? 30 * 86400000 : 90 * 86400000;
        const startDate = Date.now() - periodMs;

        const [users, attempts] = await Promise.all([
            Data.users.list(),
            Data.learning.getQuizAttempts({ all: 'true' })
        ]);
        const periodAttempts = attempts.filter(a => new Date(a.createdAt).getTime() > startDate);

        let activeUsers = 0;
        try {
            const logs = await Data.auditLogs.list({ startDate: String(startDate) });
            activeUsers = new Set(logs.map(l => l.userEmail)).size;
        } catch (error) {
            activeUsers = 0;
        }

        return {
            totalUsers: users.length,
            activeUsers,
            quizAttempts: periodAttempts.length,
            avgScore: this.calculateAverage(periodAttempts),
            period: `${new Date(startDate).toLocaleDateString()} - ${new Date().toLocaleDateString()}`
        };
    },

    calculateAverage(attempts) {
        if (!attempts.length) return 0;
        return Math.round(attempts.reduce((sum, a) => sum + (a.score || 0), 0) / attempts.length);
    },

    downloadReport(reportId) {
        const reports = JSON.parse(localStorage.getItem('reports') || '[]');
        const report = reports.find(r => r.id == reportId);
        if (!report) return;

        const content = `
SSPLP ${report.type.toUpperCase()} REPORT
Generated: ${new Date(report.generatedAt).toLocaleString()}
Period: ${report.data.period}

SUMMARY
-------
Total Users: ${report.data.totalUsers}
Active Users: ${report.data.activeUsers}
Quiz Attempts: ${report.data.quizAttempts}
Average Score: ${report.data.avgScore}%
        `;

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report_${report.type}_${Date.now()}.txt`;
        a.click();
    },

    // FR09 & FR14: System Settings — single-admin local preference, no backend model.
    getSettings() {
        return JSON.parse(localStorage.getItem('systemSettings') || JSON.stringify({
            smsProvider: 'twilio',
            emailProvider: 'sendgrid',
            notificationsEnabled: true,
            encryptionEnabled: true,
            maxLoginAttempts: 3,
            sessionTimeout: 3600000
        }));
    },

    updateSettings(settings) {
        localStorage.setItem('systemSettings', JSON.stringify(settings));
        this.logAudit('settings_updated', settings);
        Universal.showToast('Settings updated', 'success');
    },

    // FR14: Security & Audit Logs
    async logAudit(action, details) {
        try {
            await Data.auditLogs.log({ action, details });
        } catch (error) {
            console.warn('Failed to record audit log:', error.message);
        }
    },

    async getAuditLogs(filters = {}) {
        const query = {};
        if (filters.action) query.action = filters.action;
        if (filters.user) query.user = filters.user;
        if (filters.startDate) query.startDate = String(filters.startDate);
        return await Data.auditLogs.list(query);
    },

    async detectSuspiciousActivity() {
        const logs = await this.getAuditLogs({ startDate: Date.now() - 3600000 });

        const suspicious = [];
        const failedLogins = logs.filter(l => l.action === 'login_failed');

        const loginsByUser = {};
        failedLogins.forEach(l => {
            loginsByUser[l.userEmail] = (loginsByUser[l.userEmail] || 0) + 1;
        });

        Object.entries(loginsByUser).forEach(([user, count]) => {
            if (count >= 3) {
                suspicious.push({
                    type: 'multiple_failed_logins',
                    user,
                    count,
                    severity: 'high'
                });
            }
        });

        return suspicious;
    },

    // NFR04 & NFR06: Performance Monitoring (decorative — no real APM backend)
    getPerformanceMetrics() {
        const logs = JSON.parse(localStorage.getItem('activityLogs') || '[]');
        const recentLogs = logs.filter(l => l.timestamp > Date.now() - 3600000);

        return {
            requestsPerHour: recentLogs.length,
            avgResponseTime: Math.random() * 100 + 50,
            errorRate: Math.random() * 2,
            concurrentUsers: new Set(recentLogs.map(l => l.user)).size,
            uptime: 99.9
        };
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.includes('admin-dashboard')) {
        loadAdminDashboard();
    }
});

async function loadAdminDashboard() {
    const health = await AdminFeatures.getSystemHealth();
    const metrics = AdminFeatures.getPerformanceMetrics();

    document.getElementById('totalUsers').textContent = health.totalUsers;
    document.getElementById('activeUsers').textContent = health.activeUsers;
    document.getElementById('systemUptime').textContent = health.uptime + '%';
    document.getElementById('pendingApprovals').textContent = health.pendingApprovals;

    // Suspicious activity
    const suspicious = await AdminFeatures.detectSuspiciousActivity();
    const alertsContainer = document.getElementById('securityAlerts');
    if (alertsContainer) {
        alertsContainer.innerHTML = suspicious.length ? suspicious.map(s => `
            <div class="alert alert-${s.severity}">
                <i class="fas fa-exclamation-triangle"></i>
                ${s.type}: ${s.user} (${s.count} attempts)
            </div>
        `).join('') : '<p>No security alerts</p>';
    }
}
