import { getData } from '../dataStore';
import { UserStats, WorkspaceStats } from '../types';
import { getTime, getUser } from '../helpers';

// Fetches the required statistics about this user's use of UNSW Beans.
function userStats(token: string): UserStats {
  const user = getUser(token);
  return { userStats: user.userStats };
}

// Fetches the required statistics about the workspace's use of UNSW Beans.
function workspaceStats(token: string): WorkspaceStats {
  getUser(token);
  return { workspaceStats: getData().workspaceStats };
}

// Updates the workspace's stats. The functions is called
// every time the database is modified by setData().
function updateWorkspaceStats() {
  const data = getData();
  const timeStamp = getTime();
  const stats = data.workspaceStats;
  if (!stats) return;

  let len = stats.channelsExist.length;
  if (stats.channelsExist[len - 1].numChannelsExist !== data.channels.length) {
    stats.channelsExist.push({
      numChannelsExist: data.channels.length, timeStamp
    });
  }

  len = stats.dmsExist.length;
  if (stats.dmsExist[len - 1].numDmsExist !== data.DMs.length) {
    stats.dmsExist.push({
      numDmsExist: data.DMs.length, timeStamp
    });
  }

  len = stats.messagesExist.length;
  const messages = data.messages.filter(m => m.timeSent <= Date.now() / 1000);
  if (stats.messagesExist[len - 1].numMessagesExist !== messages.length) {
    stats.messagesExist.push({
      numMessagesExist: messages.length, timeStamp
    });
  }

  const numActiveUsers = data.users.filter(u =>
    [...data.channels, ...data.DMs].some(chat => chat.memberIds.includes(u.uId))
  ).length;
  stats.utilizationRate = numActiveUsers / data.users.length;
}

// Updates all users' stats in the database.
function updateUserStats() {
  const data = getData();
  for (const user of data.users) {
    const channels = data.channels.filter(c => c.memberIds.includes(user.uId));
    const dms = data.DMs.filter(dm => dm.memberIds.includes(user.uId));
    const messages = [...data.messages, ...data.removedMessages].filter(m =>
      m.uId === user.uId && m.timeSent <= Date.now() / 1000
    );

    const timeStamp = getTime();
    const stats = user.userStats;

    let len = stats.channelsJoined.length;
    if (stats.channelsJoined[len - 1].numChannelsJoined !== channels.length) {
      stats.channelsJoined.push({
        numChannelsJoined: channels.length, timeStamp
      });
    }

    len = stats.dmsJoined.length;
    if (stats.dmsJoined[len - 1].numDmsJoined !== dms.length) {
      stats.dmsJoined.push({
        numDmsJoined: dms.length, timeStamp
      });
    }

    len = stats.messagesSent.length;
    if (stats.messagesSent[len - 1].numMessagesSent !== messages.length) {
      stats.messagesSent.push({
        numMessagesSent: messages.length, timeStamp
      });
    }

    const userInvolvement = channels.length + dms.length + messages.length;
    const numCurrMessages = data.messages.filter(m => m.timeSent <= Date.now() / 1000).length;
    const overallInvolvement = data.channels.length + data.DMs.length + numCurrMessages;
    stats.involvementRate = !overallInvolvement ? 0 : Math.min(1, userInvolvement / overallInvolvement);
  }
}

export { userStats, workspaceStats, updateWorkspaceStats, updateUserStats };
