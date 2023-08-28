import HTTPError from 'http-errors';
import { BAD_REQUEST, FORBIDDEN } from '../requests';
import { getTime, getChannel, getUser, updateStandupStatus, messageGenerate, checkLength } from '../helpers';
import { getData, setData } from '../dataStore';
import { EmptyObj, TimeFinish, StandupActive } from '../types';

// For a given channel, starts a standup period lasting length seconds.
function standupStart(token: string, channelId: number, length: number): TimeFinish {
  const data = getData();
  const user = getUser(token);
  const channel = getChannel(channelId);
  updateStandupStatus(channelId);

  if (!channel.memberIds.includes(user.uId)) {
    throw HTTPError(FORBIDDEN, 'user is not a member of the channel');
  } else if (length < 0) {
    throw HTTPError(BAD_REQUEST, 'invalid time length');
  } else if (channel.standup.isActive) {
    throw HTTPError(BAD_REQUEST, 'already an active standup in channel');
  }

  const endTime = getTime() + length;
  channel.standup.isActive = true;
  channel.standup.timeFinish = endTime;
  channel.standup.creatorId = user.uId;
  setData(data);
  // setTimeout(setData, length * 1000, data);
  /*
  This line is commented out in order to reduce the test duration for standups
  as we can then terminate a test early without worrying about the setTimeout
  impacting other tests. If an alaytics test fails because stats about a standup
  message haven't been recorded, uncommenting this line should fix the issue.
  */

  return { timeFinish: endTime };
}

// For a given channel, returns whether a standup is active in it, and what time
// the standup finishes. If no standup is active, then timeFinish will be null.
function standupActive(token: string, channelId: number): StandupActive {
  const data = getData();
  const user = getUser(token);
  const channel = getChannel(channelId);
  if (!channel.memberIds.includes(user.uId)) {
    throw HTTPError(FORBIDDEN, 'user is not a member of the channel');
  }

  updateStandupStatus(channelId);
  const { creatorId, ...standup } = channel.standup;
  setData(data);

  return standup;
}

// For a given channel, if a standup is currently active in the channel,
// sends a message to get buffered in the standup queue.
function standupSend(token: string, channelId: number, message: string): EmptyObj {
  const data = getData();
  const user = getUser(token);
  const channel = getChannel(channelId);
  updateStandupStatus(channelId);

  if (!channel.memberIds.includes(user.uId)) {
    throw HTTPError(FORBIDDEN, 'user is not a member of the channel');
  } else if (!channel.standup.isActive) {
    throw HTTPError(BAD_REQUEST, 'no standup active');
  }
  checkLength(message, 0, 1000);

  const standup = channel.standup;
  const handle = user.handleStr;
  let standupMessage = data.messages.find(m => m.isStandup && m.chatId === channelId);
  if (!standupMessage) {
    standupMessage = messageGenerate(standup.creatorId, channelId, handle + ': ' + message, standup.timeFinish);
    standupMessage.isStandup = true;
    data.messages.push(standupMessage);
  } else {
    standupMessage.message += '\n' + handle + ': ' + message;
  }
  setData(data);

  return {};
}

export { standupStart, standupActive, standupSend };
