import HTTPError from 'http-errors';
import { BAD_REQUEST, FORBIDDEN } from '../requests';
import { getData, setData } from '../dataStore';
import { EmptyObj, MessageId, PaginatedMessages } from '../types';
import {
  getUser,
  getChat,
  getMessage,
  getTime,
  checkLength,
  checkOwnerPerms,
  messageGenerate,
  updateStandupStatus,
  tagMentionedUsers,
} from '../helpers';

// Sends a message from the authorised user to the channel/dm specified by the chatId, with
// possibility of sending it later in the future.
function messageSend(token: string, chatId: number, message: string, timeSent?: number): MessageId {
  const data = getData();
  const user = getUser(token);
  const chat = getChat(chatId);

  if (!chat.memberIds.includes(user.uId)) {
    throw HTTPError(FORBIDDEN, 'authorised user is not a member of the specified channel/dm');
  } else if (timeSent < getTime()) {
    throw HTTPError(BAD_REQUEST, 'cannot send a message in the past');
  }
  checkLength(message, 1, 1000);

  const messageObj = messageGenerate(user.uId, chatId, message, timeSent);
  data.messages.push(messageObj);

  if (timeSent) {
    const duration = timeSent * 1000 - Date.now();
    setTimeout(setData, duration, data);
    setTimeout(tagMentionedUsers, duration, user, chat, message);
    return { messageId: messageObj.messageId };
  }

  tagMentionedUsers(user, chat, message);
  setData(data);

  return { messageId: messageObj.messageId };
}

// Given a message, updates its text with new text. If the new message is an empty string, the message is deleted.
function messageEdit(token: string, messageId: number, message: string): EmptyObj {
  const data = getData();
  const user = getUser(token);
  const targetMessage = getMessage(messageId);
  const chat = getChat(targetMessage.chatId);

  if (targetMessage.uId !== user.uId) {
    checkOwnerPerms(user, chat);
  } else if (!chat.memberIds.includes(user.uId)) {
    throw HTTPError(BAD_REQUEST, 'user is not a member in the channel/dm');
  }
  checkLength(message, 0, 1000);

  if (message.length === 0) {
    return messageRemove(token, messageId);
  } else if (targetMessage.isStandup) {
    updateStandupStatus(targetMessage.chatId);
  }

  const index = data.messages.indexOf(targetMessage);
  data.messages[index].message = message;
  tagMentionedUsers(user, chat, message);
  setData(data);

  return {};
}

// Given a messageId, the message is removed from the channel/DM.
function messageRemove(token: string, messageId: number): EmptyObj {
  const data = getData();
  const user = getUser(token);
  const message = getMessage(messageId);
  const chat = getChat(message.chatId);

  if (message.uId !== user.uId) {
    checkOwnerPerms(user, chat);
  } else if (!chat.memberIds.includes(user.uId)) {
    throw HTTPError(BAD_REQUEST, 'user is not a member in the channel/dm');
  }

  if (message.isStandup) {
    updateStandupStatus(message.chatId);
  }

  const index = data.messages.indexOf(message);
  data.messages.splice(index, 1);
  data.removedMessages.push(message);
  setData(data);

  return {};
}

// Implementation for channelMessages and DMMessages - returns a max of 50 messages
// in the channel/dm, sorted by most recent message first.
function chatMessages(token: string, chatId: number, start: number): PaginatedMessages {
  const user = getUser(token);
  const chat = getChat(chatId);
  const messages = getData().messages
    .filter(m => m.chatId === chatId && m.timeSent <= Date.now() / 1000)
    .sort((m1, m2) => m2.timeSent - m1.timeSent)
    .map(({ chatId, isStandup, ...message }) => message);

  if (!chat.memberIds.includes(user.uId)) {
    throw HTTPError(FORBIDDEN, 'user is not a member of channel/dm');
  } else if (start > messages.length) {
    throw HTTPError(BAD_REQUEST, 'start is greater than the number of messages in the channel/dm');
  }

  for (const m of messages) {
    m.timeSent = Math.floor(m.timeSent);
    for (const react of m.reacts) {
      react.isThisUserReacted = react.uIds.includes(user.uId);
    }
  }

  return {
    messages: messages.slice(start, start + 50),
    start: start,
    end: (start + 50 >= messages.length) ? -1 : start + 50,
  };
}

export { messageSend, messageEdit, messageRemove, chatMessages };
