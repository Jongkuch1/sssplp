// Notification System - backed by the real API via window.Data
class NotificationSystem {
    // Create notification (persists via the backend)
    async create(userId, notification) {
        const result = await Data.notifications.send({
            userId,
            type: notification.type,
            message: notification.message,
            link: notification.link,
            channel: 'in-app'
        });
        this.showBrowserNotification(notification);
        return result;
    }

    // Show browser notification
    showBrowserNotification(notification) {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('SSPLP', {
                body: notification.message,
                icon: 'logo.svg'
            });
        }
    }

    // Request permission
    async requestPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        return false;
    }

    // Get user notifications
    async getNotifications(userId) {
        const result = await Data.notifications.list(userId);
        return result.notifications || [];
    }

    // Mark as read
    async markAsRead(notificationId) {
        return await Data.notifications.markRead(notificationId);
    }

    // Get unread count
    async getUnreadCount(userId) {
        const notifications = await this.getNotifications(userId);
        return notifications.filter(n => !n.read).length;
    }

    // Simulate email notification (for demo)
    sendEmailNotification(email, subject, message) {
        console.log(`📧 Email sent to ${email}`);
        console.log(`Subject: ${subject}`);
        console.log(`Message: ${message}`);

        // In production, this would call an email API
        return {
            success: true,
            message: 'Email notification sent (simulated)'
        };
    }

    // Simulate SMS notification (for demo)
    sendSMSNotification(phone, message) {
        console.log(`📱 SMS sent to ${phone}`);
        console.log(`Message: ${message}`);

        // In production, this would call an SMS API (Twilio, etc.)
        return {
            success: true,
            message: 'SMS notification sent (simulated)'
        };
    }
}

window.NotificationSystem = new NotificationSystem();

// Auto-request notification permission
window.NotificationSystem.requestPermission();
