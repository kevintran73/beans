import HTTPError from 'http-errors';
import { getData, setData } from '../dataStore';
import { getUser } from '../helpers';
import { BAD_REQUEST, FORBIDDEN } from '../requests';
import { EmptyObj } from '../types';

// Permission Ids
const GLOBAL_OWNER = 1;
const GLOBAL_MEMBER = 2;

// Given a uId, removes the user from Beans, including channels/DMs.
// The contents of the messages they sent will be replaced by 'Removed user'.
function removeUser(token: string, uId: number): EmptyObj {
  const data = getData();
  const authUser = getUser(token);
  if (!authUser.isGlobalOwner) {
    throw HTTPError(FORBIDDEN, 'only owners can remove members');
  }
  const user = getUser(uId);
  if (user.isGlobalOwner && data.users.filter(u => u.isGlobalOwner).length === 1) {
    throw HTTPError(BAD_REQUEST, 'you cannot remove yourself as the only global owner');
  }

  const messages = data.messages.filter(m => m.uId === user.uId);
  for (const m of messages) {
    m.message = 'Removed user';
  }

  const channels = data.channels.filter(c => c.memberIds.includes(user.uId));
  for (const c of channels) {
    c.memberIds.splice(c.memberIds.indexOf(user.uId), 1);
    if (c.ownerIds.includes(user.uId)) {
      c.ownerIds.splice(c.ownerIds.indexOf(user.uId), 1);
    }
  }

  const dms = data.DMs.filter(dm => dm.memberIds.includes(user.uId));
  for (const dm of dms) {
    dm.memberIds.splice(dm.memberIds.indexOf(user.uId), 1);
    if (dm.ownerId === user.uId) {
      dm.ownerId = undefined;
    }
  }

  user.nameFirst = 'Removed';
  user.nameLast = 'user';
  user.tokens = [];
  data.users.splice(data.users.indexOf(user), 1);
  data.removedUsers.push(user);
  setData(data);

  return {};
}

// Given a user by their uID, sets their permissions to new permissions described by permissionId.
function setUserPermission(token: string, uId: number, permissionId: number): EmptyObj {
  const data = getData();
  const authUser = getUser(token);
  if (!authUser.isGlobalOwner) {
    throw HTTPError(FORBIDDEN, 'only owners can change permissions');
  }
  const user = getUser(uId);
  if (user.isGlobalOwner && data.users.filter(u => u.isGlobalOwner).length === 1) {
    throw HTTPError(BAD_REQUEST, 'there must be at least one global owner at all times');
  }

  const isGlobalOwner = user.isGlobalOwner;
  if (permissionId === GLOBAL_OWNER) {
    if (isGlobalOwner) {
      throw HTTPError(BAD_REQUEST, 'already has owner permission');
    }
  } else if (permissionId === GLOBAL_MEMBER) {
    if (!isGlobalOwner) {
      throw HTTPError(BAD_REQUEST, 'already has user permission');
    }
  } else {
    throw HTTPError(BAD_REQUEST, 'invalid permission id');
  }

  user.isGlobalOwner = !isGlobalOwner;
  setData(data);

  return {};
}

export { removeUser, setUserPermission };
