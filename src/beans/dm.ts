import HTTPError from 'http-errors';
import { BAD_REQUEST, FORBIDDEN } from '../requests';
import { getData, setData } from '../dataStore';
import { generateId, getUser, getDM, checkOwnerPerms } from '../helpers';
import { EmptyObj, DMId, DMs, DMDetails } from '../types';
import { userProfile } from './users';
import { createNotification } from './notifications';

// Creates a new DM group containing the users reffered to in uIds.
function DMCreate(token: string, uIds: number[]): DMId {
  const data = getData();
  const owner = getUser(token);
  uIds.every(uId => getUser(uId));
  if (new Set(uIds).size !== uIds.length) {
    throw HTTPError(BAD_REQUEST, 'duplicate uIds provided');
  }

  const dmId = generateId();
  const ownerId = owner.uId;
  const memberIds = [ownerId, ...uIds];
  const alphabetical = (s1: string, s2: string) => s1.localeCompare(s2);
  const name = memberIds.map(uId => getUser(uId).handleStr).sort(alphabetical).join(', ');

  const dm = { dmId, ownerId, memberIds, name };
  data.DMs.push(dm);
  uIds.forEach(uId => createNotification('Added', owner, getUser(uId), dm));
  setData(data);

  return { dmId };
}

// Returns the list of DMs that the user is a member of.
function DMList(token: string): DMs {
  const user = getUser(token);
  const dms = [];
  for (const dm of getData().DMs) {
    if (dm.memberIds.includes(user.uId)) {
      dms.push({ dmId: dm.dmId, name: dm.name });
    }
  }

  return { dms };
}

// Removes an existing DM, can only be done by the original creator of the DM.
function DMRemove(token: string, dmId: number): EmptyObj {
  const data = getData();
  const user = getUser(token);
  const dm = getDM(dmId);
  checkOwnerPerms(user, dm);

  data.DMs.splice(data.DMs.indexOf(dm), 1);
  const removedMessages = data.messages.filter(m => m.chatId === dmId);
  for (const m of removedMessages) {
    data.messages.splice(data.messages.indexOf(m), 1);
    data.removedMessages.push(m);
  }
  setData(data);

  return {};
}

// Given a DM that the authorised user is a member of, provides basic details about the DM.
function getDMDetails(token: string, dmId: number): DMDetails {
  const user = getUser(token);
  const dm = getDM(dmId);
  if (!dm.memberIds.includes(user.uId)) {
    throw HTTPError(FORBIDDEN, 'user is not a member of the dm');
  }

  const users = [];
  for (const id of dm.memberIds) {
    users.push(userProfile(token, id).user);
  }

  return {
    name: dm.name,
    members: users,
  };
}

// Given a DM ID, the user is removed as a member of this DM.
function DMLeave(token: string, dmId: number): EmptyObj {
  const data = getData();
  const user = getUser(token);
  const dm = getDM(dmId);
  if (!dm.memberIds.includes(user.uId)) {
    throw HTTPError(FORBIDDEN, 'user is not a member of the dm');
  }

  dm.memberIds.splice(dm.memberIds.indexOf(user.uId), 1);
  if (dm.ownerId === user.uId) {
    dm.ownerId = undefined;
  }
  setData(data);

  return {};
}

export { DMCreate, DMList, DMRemove, getDMDetails, DMLeave };
