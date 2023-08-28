import { getData, setData } from '../dataStore';
import { getUser, generateId, checkLength } from '../helpers';
import { ChannelId, Channels } from '../types';

// Creates a private or public channel with the given name,
// returning the channel ID or an error if invalid name/token.
function channelsCreate(token: string, name: string, isPublic: boolean): ChannelId {
  const data = getData();
  const user = getUser(token);
  checkLength(name, 1, 20);

  const channelId = generateId();
  data.channels.push({
    channelId,
    name,
    isPublic,
    ownerIds: [user.uId],
    memberIds: [user.uId],
    standup: { isActive: false, timeFinish: null, creatorId: null },
  });
  setData(data);

  return { channelId };
}

// Provides an array of all the channels an authorised user is a member of.
function channelsList(token: string): Channels {
  const user = getUser(token);
  return {
    channels:
      getData().channels
        .filter(c => c.memberIds.includes(user.uId))
        .map(c => ({ channelId: c.channelId, name: c.name }))
  };
}

// Provides an array of all the channels, both public and private.
function channelsListAll(token: string): Channels {
  getUser(token);
  return {
    channels: getData().channels.map(c => ({ channelId: c.channelId, name: c.name }))
  };
}

export { channelsCreate, channelsList, channelsListAll };
