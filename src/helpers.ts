import crypto from 'crypto';
import HTTPError from 'http-errors';
import { SECRET } from './beans/auth';
import { BAD_REQUEST, FORBIDDEN } from './requests';
import { getData, setData } from './dataStore';
import { createNotification } from './beans/notifications';
import { User, Channel, DM, Message, React } from './types';

// Returns the hash of a string using sha256.
function getHashOf(str: string): string {
  return crypto.createHash('sha256').update(str).digest('hex');
}

// Returns the user referred to by either a token or a user ID. Tokens
// can only be strings and user IDs can only be numbers, so there
// are no conflicts. Returns undefined if the identifier does not exist.
function getUser(identifier: number | string): User {
  let user: User;
  if (typeof identifier === 'string') {
    const token = getHashOf(identifier + SECRET);
    user = getData().users.find(u => u.tokens.includes(token));
    if (!user) {
      throw HTTPError(FORBIDDEN, 'invalid token');
    }
    return user;
  }

  user = getData().users.find(u => u.uId === identifier);
  if (!user) {
    throw HTTPError(BAD_REQUEST, 'invalid uId');
  }
  return user;
}

// Returns the channel referred to by channelId.
// Returns undefined if channelId does not exist.
function getChannel(channelId: number): Channel {
  const channel = getData().channels.find(c => c.channelId === channelId);
  if (!channel) {
    throw HTTPError(BAD_REQUEST, 'invalid channelId');
  }
  return channel;
}

// Returns the DM referred to by dmId.
// Returns undefined if dmId does not exist.
function getDM(dmId: number): DM {
  const dm = getData().DMs.find(dm => dm.dmId === dmId);
  if (!dm) {
    throw HTTPError(BAD_REQUEST, 'invalid channelId');
  }
  return dm;
}

// Returns the the channel/DM referred to by chatId
function getChat(chatId: number): Channel | DM {
  const channel = getData().channels.find(c => c.channelId === chatId);
  const dm = getData().DMs.find(dm => dm.dmId === chatId);
  if (!channel && !dm) {
    throw HTTPError(BAD_REQUEST, 'invalid channel/dm Id');
  }
  return channel || dm;
}

// Returns the message referred to by messageId.
// Returns undefined if messageId does not exist.
function getMessage(messageId: number): Message {
  const message = getData().messages.find(m => m.messageId === messageId && m.timeSent <= Date.now() / 1000);
  if (!message) {
    throw HTTPError(BAD_REQUEST, 'invalid messageId');
  }
  return message;
}

// Returns the react referred to by reactId of message referred to by messageId.
// Returns undefined if messageId does not exist.
function getReact(reactId: number, message: Message): React {
  return message.reacts.find(r => r.reactId === reactId);
}

// Returns the current time in seconds.
function getTime(): number {
  return Math.floor(Date.now() / 1000);
}

// Checks whether the length of the given string is between min and max inclusive.
function checkLength(str: string, min: number, max: number) {
  if (str.length < min || str.length > max) {
    throw HTTPError(BAD_REQUEST, `string length needs to be between ${min} and ${max} inclusive`);
  }
}

// Generates a random integer ID that is extremely unlikely to be a duplicate.
function generateId(): number {
  return Date.now() + Math.ceil(Math.random() * 659270368152904);
}

// Generates a unique handle for a user that is the concatentaion of their
// casted-to-lowercase alphanumeric first and last names, max 20 characters.
function handleGenerate(nameFirst: string, nameLast: string): string {
  const handleStr = (nameFirst + nameLast).toLowerCase().replace(/[^\w]/g, '').slice(0, 20);
  for (let append = '', n = 0; ; append = String(n++)) {
    if (!getData().users.find(u => u.handleStr === handleStr + append)) {
      return handleStr + append;
    }
  }
}

// Generates a message object to be stored in the dataStore.
function messageGenerate(uId: number, chatId: number, message: string, time?: number): Message {
  return {
    uId,
    chatId,
    message,
    messageId: generateId(),
    timeSent: time || Date.now() / 1000,
    reacts: [{ reactId: 1, uIds: [], isThisUserReacted: false }],
    isPinned: false,
    isStandup: false,
  };
}

// Checks whether the given user has owner permissions in the given channel/DM.
function checkOwnerPerms(user: User, location: Channel | DM) {
  let hasOwnerPerms = false;
  if ('dmId' in location) {
    hasOwnerPerms = user.uId === location.ownerId;
  } else {
    hasOwnerPerms =
      location.ownerIds.includes(user.uId) ||
      (location.memberIds.includes(user.uId) && user.isGlobalOwner);
  }
  if (!hasOwnerPerms) {
    throw HTTPError(FORBIDDEN, 'user does not have owner permissions in the channel/dm');
  }
}

// Checks whether a standup is still active,
// and if not change isActive to false and timeFinish to null
function updateStandupStatus(chatId: number) {
  const data = getData();
  const channel = getChannel(chatId);
  if (channel && channel.standup.timeFinish <= Date.now() / 1000) {
    channel.standup.isActive = false;
    channel.standup.timeFinish = null;
    channel.standup.creatorId = null;
    setData(data);
  }
}

// Sends notifications to valid users tagged in the message.
function tagMentionedUsers(notifier: User, chat: Channel | DM, message: string) {
  const tags = message.match(/@\w*/g);
  if (!tags) return;

  const handles = tags.map(tag => tag.slice(1)); // get rid of '@'
  const uniqueHandles = Array.from(new Set(handles));
  for (const handle of uniqueHandles) {
    const user = getData().users.find(u => u.handleStr === handle);
    if (user && chat.memberIds.includes(user.uId)) {
      createNotification('Tagged', notifier, user, chat, message);
    }
  }
}

// Gets the resetCode for a user - used to white-box test password resetting.
function getResetCode(uId: number) {
  return getData().resetCodes.find(code => code.uId === uId).resetCode;
}

export {
  getHashOf,
  getUser,
  getChannel,
  getDM,
  getChat,
  getMessage,
  getReact,
  getTime,
  checkLength,
  generateId,
  handleGenerate,
  messageGenerate,
  checkOwnerPerms,
  updateStandupStatus,
  tagMentionedUsers,
  getResetCode,
};
