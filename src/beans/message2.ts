import HTTPError from 'http-errors';
import { createNotification } from './notifications';
import { BAD_REQUEST, FORBIDDEN } from '../requests';
import { getData, setData } from '../dataStore';
import { EmptyObj, SharedMessageId, Messages } from '../types';
import {
  getUser,
  getChannel,
  getDM,
  getChat,
  getMessage,
  getReact,
  checkLength,
  checkOwnerPerms,
  messageGenerate,
  tagMentionedUsers,
} from '../helpers';

// Given a query substring, returns a collection of messages in all of the channels/DMs
// that the user has joined that contain the query (case-insensitive).
function messageSearch(token: string, queryStr: string): Messages {
  const data = getData();
  const user = getUser(token);
  checkLength(queryStr, 1, 1000);
  queryStr = queryStr.toLowerCase();

  const returnMessages = [];
  for (const m of data.messages) {
    if (m.timeSent > Date.now() / 1000) continue;
    const chat = getChat(m.chatId);
    const messageStr = m.message.toLowerCase();
    if (chat.memberIds.includes(user.uId) && messageStr.includes(queryStr)) {
      returnMessages.push({
        messageId: m.messageId,
        uId: m.uId,
        message: m.message,
        timeSent: Math.floor(m.timeSent),
        reacts: m.reacts,
        isPinned: m.isPinned,
      });
    }
  }

  for (const m of returnMessages) {
    for (const react of m.reacts) {
      react.isThisUserReacted = react.uIds.includes(user.uId);
    }
  }

  return { messages: returnMessages };
}

// Shares a message to a channel/dm, with an optional message to send with it.
function messageShare(token: string, ogMessageId: number, channelId: number, dmId: number, message?: string): SharedMessageId {
  const data = getData();
  const user = getUser(token);
  const targetChat = dmId === -1 ? getChannel(channelId) : getDM(dmId);

  if ((channelId === -1 && dmId === -1) || (channelId !== -1 && dmId !== -1)) {
    throw HTTPError(BAD_REQUEST, 'invalid channel and dm id input format');
  } else if (!targetChat.memberIds.includes(user.uId)) {
    throw HTTPError(FORBIDDEN, 'authorised user is not a part of the channel/DM that they are sharing to');
  }
  checkLength((message ||= ''), 0, 1000);

  const ogMessage = getMessage(ogMessageId);
  const ogChat = getChat(ogMessage.chatId);
  if (!ogChat.memberIds.includes(user.uId)) {
    throw HTTPError(BAD_REQUEST, 'authorised user is not a part of the channel/DM that the original message is within');
  }

  const sharedMessage = messageGenerate(user.uId, dmId === -1 ? channelId : dmId, `${message}: ${ogMessage.message}`);
  data.messages.push(sharedMessage);
  tagMentionedUsers(user, targetChat, message);
  setData(data);

  return { sharedMessageId: sharedMessage.messageId };
}

// Given a message within a channel or DM the authorised user
// is part of, adds a "react" to that particular message.
function messageReact(token: string, messageId: number, reactId: number): EmptyObj {
  const data = getData();
  const user = getUser(token);
  const message = getMessage(messageId);
  const chat = getChat(message.chatId);

  if (reactId !== 1) {
    throw HTTPError(BAD_REQUEST, 'invalid react id');
  } else if (!chat.memberIds.includes(user.uId)) {
    throw HTTPError(BAD_REQUEST, 'authorised user is not a part of the channel/DM that the message is within');
  }

  const react = getReact(reactId, message);
  if (react.uIds.includes(user.uId)) {
    throw HTTPError(BAD_REQUEST, 'message has already been reacted to with this react ID by the authorised user');
  }

  react.uIds.push(user.uId);
  if (chat.memberIds.includes(message.uId)) {
    createNotification('Reacted', user, getUser(message.uId), chat);
  }

  setData(data);
  return {};
}

// Given a message within a channel or DM the authorised user
// is part of, removes a "react" to that particular message.
function messageUnreact(token: string, messageId: number, reactId: number): EmptyObj {
  const data = getData();
  const user = getUser(token);
  const message = getMessage(messageId);
  const chat = getChat(message.chatId);

  if (reactId !== 1) {
    throw HTTPError(BAD_REQUEST, 'invalid react id');
  } else if (!chat.memberIds.includes(user.uId)) {
    throw HTTPError(BAD_REQUEST, 'authorised user is not a part of the channel/DM that the message is within');
  }

  const react = getReact(reactId, message);
  if (!react.uIds.includes(user.uId)) {
    throw HTTPError(BAD_REQUEST, 'the message does not contain a react with reactID from the authorised user');
  }

  react.uIds = react.uIds.filter((uId) => uId !== user.uId);
  setData(data);

  return {};
}

// Given a message within a channel or DM, marks it as "pinned".
function messagePin(token: string, messageId: number): EmptyObj {
  const data = getData();
  const user = getUser(token);
  const message = getMessage(messageId);
  const chat = getChat(message.chatId);

  if (!chat.memberIds.includes(user.uId)) {
    throw HTTPError(BAD_REQUEST, 'message ID invalid in channels/DMs the authorised user is part of');
  } else {
    checkOwnerPerms(user, chat);
  }
  if (message.isPinned) {
    throw HTTPError(BAD_REQUEST, 'message is already pinned');
  }

  message.isPinned = true;
  setData(data);

  return {};
}

// Given a message within a channel or DM, removes its mark as "pinned".
function messageUnpin(token: string, messageId: number): EmptyObj {
  const data = getData();
  const user = getUser(token);
  const message = getMessage(messageId);
  const chat = getChat(message.chatId);

  if (!chat.memberIds.includes(user.uId)) {
    throw HTTPError(BAD_REQUEST, 'message ID invalid in channels/DMs the authorised user is part of');
  } else {
    checkOwnerPerms(user, chat);
  }
  if (!message.isPinned) {
    throw HTTPError(BAD_REQUEST, 'message is already not pinned');
  }

  message.isPinned = false;
  setData(data);

  return {};
}

export { messageSearch, messageShare, messageReact, messageUnreact, messagePin, messageUnpin };
