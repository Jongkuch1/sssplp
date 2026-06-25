// Quick Actions Notification Badges - backed by the real API via window.Data
document.addEventListener('DOMContentLoaded', function() {
    async function updateQuickActionBadges() {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (!currentUser.id) return;

        // Check for new quizzes
        try {
            const [quizzes, attempts] = await Promise.all([
                Data.learning.getQuizzes(),
                Data.learning.getQuizAttempts()
            ]);
            const attemptedQuizIds = new Set(attempts.map(a => a.quizId?._id || a.quizId));
            const newQuizzes = quizzes.filter(q => !attemptedQuizIds.has(q._id)).length;

            if (newQuizzes > 0) {
                const badge = document.getElementById('quizzesBadge');
                if (badge) {
                    badge.textContent = newQuizzes + ' New';
                    badge.style.display = 'block';
                }
            }
        } catch (error) {
            console.warn('Could not refresh quiz badge', error.message);
        }

        // Check for unread messages
        try {
            const unreadCount = await window.NotificationSystem.getUnreadCount(currentUser.id);
            if (unreadCount > 0) {
                const badge = document.getElementById('helpBadge');
                if (badge) {
                    badge.textContent = unreadCount;
                    badge.style.display = 'block';
                }
            }
        } catch (error) {
            console.warn('Could not refresh message badge', error.message);
        }

        // Check for progress updates
        try {
            const progress = await Data.learning.getProgress();
            if (progress.length > 0) {
                const badge = document.getElementById('progressBadge');
                if (badge) {
                    badge.textContent = 'Updated';
                    badge.style.display = 'block';
                }
            }
        } catch (error) {
            console.warn('Could not refresh progress badge', error.message);
        }
    }

    // Update badges immediately
    updateQuickActionBadges();

    // Update every 30 seconds (real API calls now, not just a localStorage read)
    setInterval(updateQuickActionBadges, 30000);
});
