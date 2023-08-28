import HTTPError from 'http-errors';
import { BAD_REQUEST, FORBIDDEN } from '../requests';
import { getData, setData } from '../dataStore';
import { getUser, getChannel, checkOwnerPerms, updateStandupStatus } from '../helpers';
import { userProfile } from './users';
import { EmptyObj, ChannelDetails } from '../types';
import { createNotification } from './notifications';

// Given a channel that the authorised user is a member of,
// provides basic details about the channel.
function channelDetails(token: string, channelId: number): ChannelDetails {
  const user = getUser(token);
  const channel = getChannel(channelId);
  if (!channel.memberIds.includes(user.uId)) {
    throw HTTPError(FORBIDDEN, 'authorised user is not a member of the specified channel');
  }

  const getProfile = (uId: number) => userProfile(token, uId).user;
  return {
    name: channel.name,
    isPublic: channel.isPublic,
    ownerMembers: channel.ownerIds.map(getProfile),
    allMembers: channel.memberIds.map(getProfile),
  };
}

// Given a channel that the authorised user can join, adds them to that channel.
function channelJoin(token: string, channelId: number): EmptyObj {
  const data = getData();
  const user = getUser(token);
  const channel = getChannel(channelId);

  if (!user.isGlobalOwner && !channel.isPublic) {
    throw HTTPError(FORBIDDEN, 'non global owners may not join a private channel');
  } else if (channel.memberIds.includes(user.uId)) {
    throw HTTPError(BAD_REQUEST, 'user already belongs to channel');
  }

  channel.memberIds.push(user.uId);
  setData(data);

  return {};
}

// Invites a user to join a channel which adds them to it immediately.
function channelInvite(token: string, channelId: number, uId: number): EmptyObj {
  const data = getData();
  const inviter = getUser(token);
  const invitee = getUser(uId);
  const channel = getChannel(channelId);

  if (!channel.memberIds.includes(inviter.uId)) {
    throw HTTPError(FORBIDDEN, 'user sending the invite is not a member of the specified channel');
  } else if (channel.memberIds.includes(invitee.uId)) {
    throw HTTPError(BAD_REQUEST, 'user being invited is already a member of the specified channel');
  }

  createNotification('Added', inviter, invitee, channel);
  channel.memberIds.push(invitee.uId);
  setData(data);

  return {};
}

// Removes the authorised user from the channel as a member, keeping their messages.
function channelLeave(token: string, channelId: number): EmptyObj {
  const data = getData();
  const user = getUser(token);
  const channel = getChannel(channelId);
  updateStandupStatus(channelId);

  if (!channel.memberIds.includes(user.uId)) {
    throw HTTPError(FORBIDDEN, 'authorised user is not a member of the specified channel');
  } else if (channel.standup.isActive && channel.standup.creatorId === user.uId) {
    throw HTTPError(BAD_REQUEST, 'authorised user started the active standup');
  }

  channel.memberIds.splice(channel.memberIds.indexOf(user.uId), 1);
  if (channel.ownerIds.includes(user.uId)) {
    channel.ownerIds.splice(channel.ownerIds.indexOf(user.uId), 1);
  }
  setData(data);

  return {};
}

// Makes user with uId an owner of the channel.
function channelAddOwner(token: string, channelId: number, uId: number): EmptyObj {
  const data = getData();
  const currOwner = getUser(token);
  const newOwner = getUser(uId);
  const channel = getChannel(channelId);
  checkOwnerPerms(currOwner, channel);

  if (!channel.memberIds.includes(newOwner.uId)) {
    throw HTTPError(BAD_REQUEST, 'uId refers to someone who is not a member of the specified channel');
  } else if (channel.ownerIds.includes(newOwner.uId)) {
    throw HTTPError(BAD_REQUEST, 'uId refers to someone who is already an owner of the specified channel');
  }

  channel.ownerIds.push(newOwner.uId);
  setData(data);

  return {};
}

// Removes user with uId as an owner of the channel.
function channelRemoveOwner(token: string, channelId: number, uId: number): EmptyObj {
  const data = getData();
  const currOwner = getUser(token);
  const removedOwner = getUser(uId);
  const channel = getChannel(channelId);
  checkOwnerPerms(currOwner, channel);

  if (!channel.ownerIds.includes(removedOwner.uId)) {
    throw HTTPError(BAD_REQUEST, 'uId refers to someone who is not an owner of the specified channel');
  } else if (channel.ownerIds.length === 1) {
    throw HTTPError(BAD_REQUEST, 'uId refers to someone who is the only owner of the specified channel');
  }

  channel.ownerIds.splice(channel.ownerIds.indexOf(removedOwner.uId), 1);
  setData(data);

  return {};
}

export { channelDetails, channelJoin, channelInvite, channelLeave, channelAddOwner, channelRemoveOwner };
