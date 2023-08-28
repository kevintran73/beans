import { getData, setData } from '../dataStore';
import { Notifications, User, Channel, DM } from '../types';
import { getUser } from '../helpers';

type NotificationType = 'Tagged' | 'Reacted' | 'Added';

// Returns the user's most recent 20 notifications, ordered from most recent to least recent.
function getNotifications(token: string): Notifications {
  const user = getUser(token);
  const notifications = [];
  for (const notification of getData().notifications) {
    if (notifications.length === 20) {
      break;
    } else if (notification.uId === user.uId) {
      notifications.push({
        channelId: notification.channelId,
        dmId: notification.dmId,
        notificationMessage: notification.notificationMessage,
      });
    }
  }

  return { notifications };
}

// Creates a new notification for a user and stores it to the database.
function createNotification(type: NotificationType, notifier: User, notified: User, chat: Channel | DM, message?: string) {
  let notificationMessage = `${notifier.handleStr} `;
  switch (type) {
    case 'Tagged':
      notificationMessage += `tagged you in ${chat.name}: ${message.slice(0, 20)}`;
      break;
    case 'Reacted':
      notificationMessage += `reacted to your message in ${chat.name}`;
      break;
    case 'Added':
      notificationMessage += `added you to ${chat.name}`;
      break;
  }

  const data = getData();
  data.notifications.unshift({
    uId: notified.uId,
    channelId: 'channelId' in chat ? chat.channelId : -1,
    dmId: 'dmId' in chat ? chat.dmId : -1,
    notificationMessage,
  });
  setData(data);
}

export { getNotifications, createNotification };
