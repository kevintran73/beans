import { UserStats, WorkspaceStats } from '../types';
import {
  FORBIDDEN,
  reqAuthRegister,
  reqClear,
  reqUserStats,
  reqWorkspaceStats,
  reqChannelsCreate,
  reqChannelLeave,
  reqChannelJoin,
  reqChannelAddOwner,
  reqDMCreate,
  reqDMLeave,
  reqDMRemove,
  reqMessageSend,
  reqMessageSendDM,
  reqMessageRemove,
  reqMessageEdit,
  reqMessageSendLater,
  reqStandupStart,
  reqStandupSend,
} from '../requests';

const DELAY = 100;

function expectedUserStats(
  info: {
    numChannels: number[],
    numDms: number[],
    numMessages: number[],
  },
  involvementRate: number
) {
  const expected: UserStats = {
    userStats: {
      channelsJoined: [],
      dmsJoined: [],
      messagesSent: [],
      involvementRate,
    }
  };

  for (const n of info.numChannels) {
    expected.userStats.channelsJoined.push({
      numChannelsJoined: n, timeStamp: expect.any(Number),
    });
  }

  for (const n of info.numDms) {
    expected.userStats.dmsJoined.push({
      numDmsJoined: n, timeStamp: expect.any(Number),
    });
  }

  for (const n of info.numMessages) {
    expected.userStats.messagesSent.push({
      numMessagesSent: n, timeStamp: expect.any(Number),
    });
  }

  return expected;
}

function expectedWorkspaceStats(
  info: {
    numChannels: number[],
    numDms: number[],
    numMessages: number[],
  },
  utilizationRate: number
) {
  const expected: WorkspaceStats = {
    workspaceStats: {
      channelsExist: [],
      dmsExist: [],
      messagesExist: [],
      utilizationRate,
    }
  };

  for (const n of info.numChannels) {
    expected.workspaceStats.channelsExist.push({
      numChannelsExist: n, timeStamp: expect.any(Number),
    });
  }

  for (const n of info.numDms) {
    expected.workspaceStats.dmsExist.push({
      numDmsExist: n, timeStamp: expect.any(Number),
    });
  }

  for (const n of info.numMessages) {
    expected.workspaceStats.messagesExist.push({
      numMessagesExist: n, timeStamp: expect.any(Number),
    });
  }

  return expected;
}

let globalOwner: { token: string, authUserId: number };
let token: string;
beforeEach(() => {
  reqClear();
  globalOwner = reqAuthRegister('email@gmail.com', 'password', 'global', 'owner');
  token = globalOwner.token;
});

test('error: invalid token', () => {
  const invalidToken = token + '1';
  expect(reqUserStats(invalidToken)).toEqual(FORBIDDEN);
  expect(reqWorkspaceStats(invalidToken)).toEqual(FORBIDDEN);
});

test('stats correctly initialized when Beans is created', () => {
  expect(reqUserStats(token)).toStrictEqual(expectedUserStats({
    numChannels: [0],
    numDms: [0],
    numMessages: [0],
  }, 0));

  expect(reqWorkspaceStats(token)).toStrictEqual(expectedWorkspaceStats({
    numChannels: [0],
    numDms: [0],
    numMessages: [0],
  }, 0));
});

describe('channel stats', () => {
  test('one channel created by global owner', () => {
    reqChannelsCreate(token, 'channel', false);

    expect(reqUserStats(token)).toStrictEqual(expectedUserStats({
      numChannels: [0, 1],
      numDms: [0],
      numMessages: [0],
    }, (1 + 0 + 0) / (1 + 0 + 0)));

    expect(reqWorkspaceStats(token)).toStrictEqual(expectedWorkspaceStats({
      numChannels: [0, 1],
      numDms: [0],
      numMessages: [0],
    }, 1 / 1));
  });

  test('one channel created by another user', () => {
    const user2 = reqAuthRegister('user@gmail.com', 'password', 'second', 'user');
    reqChannelsCreate(user2.token, 'channel', false);

    expect(reqUserStats(user2.token)).toStrictEqual(expectedUserStats({
      numChannels: [0, 1],
      numDms: [0],
      numMessages: [0],
    }, (1 + 0 + 0) / (1 + 0 + 0)));

    expect(reqUserStats(token)).toStrictEqual(expectedUserStats({
      numChannels: [0],
      numDms: [0],
      numMessages: [0],
    }, (0 + 0 + 0) / (1 + 0 + 0)));

    expect(reqWorkspaceStats(token)).toStrictEqual(expectedWorkspaceStats({
      numChannels: [0, 1],
      numDms: [0],
      numMessages: [0],
    }, 1 / 2));
  });

  test.skip('multiple channels, multiple users', () => {
    reqChannelsCreate(token, 'channel', false);
    reqChannelsCreate(token, 'channel2', false);
    reqChannelsCreate(token, 'channel3', false);
    expect(reqUserStats(token)).toStrictEqual(expectedUserStats({
      numChannels: [0, 1, 2, 3],
      numDms: [0],
      numMessages: [0],
    }, (3 + 0 + 0) / (3 + 0 + 0)));

    const user2 = reqAuthRegister('user@gmail.com', 'password', 'second', 'user');
    const channel4Id = reqChannelsCreate(user2.token, 'channel4', false).channelId;
    const channel5Id = reqChannelsCreate(user2.token, 'channel5', false).channelId;
    expect(reqUserStats(user2.token)).toStrictEqual(expectedUserStats({
      numChannels: [0, 1, 2],
      numDms: [0],
      numMessages: [0],
    }, (2 + 0 + 0) / (5 + 0 + 0)));

    reqChannelJoin(globalOwner.token, channel4Id);
    reqChannelAddOwner(user2.token, channel4Id, globalOwner.authUserId);
    expect(reqUserStats(token)).toStrictEqual(expectedUserStats({
      numChannels: [0, 1, 2, 3, 4],
      numDms: [0],
      numMessages: [0],
    }, (4 + 0 + 0) / (5 + 0 + 0)));

    reqChannelLeave(user2.token, channel4Id);
    expect(reqUserStats(user2.token)).toStrictEqual(expectedUserStats({
      numChannels: [0, 1, 2, 1],
      numDms: [0],
      numMessages: [0],
    }, (1 + 0 + 0) / (5 + 0 + 0)));

    expect(reqWorkspaceStats(token)).toStrictEqual(expectedWorkspaceStats({
      numChannels: [0, 1, 2, 3, 4, 5],
      numDms: [0],
      numMessages: [0],
    }, 2 / 2));

    reqChannelJoin(globalOwner.token, channel5Id);
    reqChannelAddOwner(user2.token, channel5Id, globalOwner.authUserId);
    reqChannelLeave(user2.token, channel5Id);
    expect(reqWorkspaceStats(token)).toStrictEqual(expectedWorkspaceStats({
      numChannels: [0, 1, 2, 3, 4, 5],
      numDms: [0],
      numMessages: [0],
    }, 1 / 2));
  });
});

describe('dm stats', () => {
  test('dms - creating', () => {
    const user2 = reqAuthRegister('user@gmail.com', 'password', 'second', 'user');
    const user3 = reqAuthRegister('user@xmail.com', 'password', 'third', 'user');
    reqDMCreate(token, []);
    reqDMCreate(token, [user2.authUserId]);
    reqDMCreate(token, [user2.authUserId, user3.authUserId]);

    expect(reqUserStats(token)).toStrictEqual(expectedUserStats({
      numChannels: [0],
      numDms: [0, 1, 2, 3],
      numMessages: [0],
    }, (0 + 3 + 0) / (0 + 3 + 0)));

    expect(reqUserStats(user2.token)).toStrictEqual(expectedUserStats({
      numChannels: [0],
      numDms: [0, 1, 2],
      numMessages: [0],
    }, (0 + 2 + 0) / (0 + 3 + 0)));

    expect(reqUserStats(user3.token)).toStrictEqual(expectedUserStats({
      numChannels: [0],
      numDms: [0, 1],
      numMessages: [0],
    }, (0 + 1 + 0) / (0 + 3 + 0)));

    reqAuthRegister('user@qmail.com', 'password', 'fourth', 'user');
    expect(reqWorkspaceStats(token)).toStrictEqual(expectedWorkspaceStats({
      numChannels: [0],
      numDms: [0, 1, 2, 3],
      numMessages: [0],
    }, 3 / 4));
  });

  test('dms - leaving', () => {
    const user2 = reqAuthRegister('user@gmail.com', 'password', 'second', 'user');
    const dmId1 = reqDMCreate(token, []).dmId;
    const dmId2 = reqDMCreate(token, [user2.authUserId]).dmId;

    reqDMLeave(token, dmId1);
    expect(reqUserStats(token)).toStrictEqual(expectedUserStats({
      numChannels: [0],
      numDms: [0, 1, 2, 1],
      numMessages: [0],
    }, (0 + 1 + 0) / (0 + 2 + 0)));

    reqDMLeave(token, dmId2);
    expect(reqUserStats(token)).toStrictEqual(expectedUserStats({
      numChannels: [0],
      numDms: [0, 1, 2, 1, 0],
      numMessages: [0],
    }, (0 + 0 + 0) / (0 + 2 + 0)));

    expect(reqUserStats(user2.token)).toStrictEqual(expectedUserStats({
      numChannels: [0],
      numDms: [0, 1],
      numMessages: [0],
    }, (0 + 1 + 0) / (0 + 2 + 0)));

    expect(reqWorkspaceStats(token)).toStrictEqual(expectedWorkspaceStats({
      numChannels: [0],
      numDms: [0, 1, 2],
      numMessages: [0],
    }, 1 / 2));
  });

  test('dms - removing', () => {
    const user2 = reqAuthRegister('user@gmail.com', 'password', 'second', 'user');
    const dmId1 = reqDMCreate(token, []).dmId;
    const dmId2 = reqDMCreate(token, [user2.authUserId]).dmId;

    reqDMRemove(token, dmId1);
    expect(reqUserStats(token)).toStrictEqual(expectedUserStats({
      numChannels: [0],
      numDms: [0, 1, 2, 1],
      numMessages: [0],
    }, (0 + 1 + 0) / (0 + 1 + 0)));
    expect(reqWorkspaceStats(token)).toStrictEqual(expectedWorkspaceStats({
      numChannels: [0],
      numDms: [0, 1, 2, 1],
      numMessages: [0],
    }, 2 / 2));

    reqDMRemove(token, dmId2);
    expect(reqUserStats(token)).toStrictEqual(expectedUserStats({
      numChannels: [0],
      numDms: [0, 1, 2, 1, 0],
      numMessages: [0],
    }, 0));
    expect(reqUserStats(user2.token)).toStrictEqual(expectedUserStats({
      numChannels: [0],
      numDms: [0, 1, 0],
      numMessages: [0],
    }, 0));
    expect(reqWorkspaceStats(token)).toStrictEqual(expectedWorkspaceStats({
      numChannels: [0],
      numDms: [0, 1, 2, 1, 0],
      numMessages: [0],
    }, 0));
  });
});

describe('messages stats', () => {
  test('sending messages', () => {
    const user2 = reqAuthRegister('user@gmail.com', 'password', 'second', 'user');
    const dmId = reqDMCreate(token, [user2.authUserId]).dmId;
    const channelId = reqChannelsCreate(token, 'channel', true).channelId;
    reqChannelJoin(user2.token, channelId);

    reqMessageSend(token, channelId, 'hello, how are you?');
    reqMessageSend(user2.token, channelId, 'good, and you?');
    expect(reqUserStats(token)).toStrictEqual(expectedUserStats({
      numChannels: [0, 1],
      numDms: [0, 1],
      numMessages: [0, 1],
    }, (1 + 1 + 1) / (1 + 1 + 2)));
    expect(reqUserStats(user2.token)).toStrictEqual(expectedUserStats({
      numChannels: [0, 1],
      numDms: [0, 1],
      numMessages: [0, 1],
    }, (1 + 1 + 1) / (1 + 1 + 2)));

    reqMessageSendDM(token, dmId, 'hehe private dm convo');
    reqMessageSendDM(token, dmId, 'very spicy');
    reqMessageSendDM(user2.token, dmId, 'meh');
    expect(reqUserStats(token)).toStrictEqual(expectedUserStats({
      numChannels: [0, 1],
      numDms: [0, 1],
      numMessages: [0, 1, 2, 3],
    }, (1 + 1 + 3) / (1 + 1 + 5)));
    expect(reqUserStats(user2.token)).toStrictEqual(expectedUserStats({
      numChannels: [0, 1],
      numDms: [0, 1],
      numMessages: [0, 1, 2],
    }, (1 + 1 + 2) / (1 + 1 + 5)));

    expect(reqWorkspaceStats(token)).toStrictEqual(expectedWorkspaceStats({
      numChannels: [0, 1],
      numDms: [0, 1],
      numMessages: [0, 1, 2, 3, 4, 5],
    }, 2 / 2));
  });

  test('removing messages', () => {
    const user2 = reqAuthRegister('user@gmail.com', 'password', 'second', 'user');
    const dmId = reqDMCreate(token, [user2.authUserId]).dmId;

    reqMessageSendDM(token, dmId, 'hehe private dm convo');
    const messageId1 = reqMessageSendDM(token, dmId, 'very spicy').messageId;
    const messageId2 = reqMessageSendDM(user2.token, dmId, 'meh').messageId;
    reqMessageRemove(token, messageId1);
    reqMessageEdit(user2.token, messageId2, '');
    expect(reqUserStats(token)).toStrictEqual(expectedUserStats({
      numChannels: [0],
      numDms: [0, 1],
      numMessages: [0, 1, 2], // removing messages does not decrement count
    }, 1)); // since user involvement rate is higher than overall involvement
    expect(reqUserStats(user2.token)).toStrictEqual(expectedUserStats({
      numChannels: [0],
      numDms: [0, 1],
      numMessages: [0, 1], // removing messages does not decrement count
    }, 1)); // since user involvement rate is higher than overall involvement

    expect(reqWorkspaceStats(token)).toStrictEqual(expectedWorkspaceStats({
      numChannels: [0],
      numDms: [0, 1],
      numMessages: [0, 1, 2, 3, 2, 1],
    }, 2 / 2));
  });

  test('sending messages via sendlater', async () => {
    const channelId = reqChannelsCreate(token, 'channel', true).channelId;
    reqMessageSendLater(token, channelId, 'hi from the future', Date.now() / 1000 + 1.5);
    expect(reqUserStats(token)).toStrictEqual(expectedUserStats({
      numChannels: [0, 1],
      numDms: [0],
      numMessages: [0],
    }, 1));
    expect(reqWorkspaceStats(token)).toStrictEqual(expectedWorkspaceStats({
      numChannels: [0, 1],
      numDms: [0],
      numMessages: [0],
    }, 1));

    await new Promise(r => setTimeout(r, 1500 + DELAY));
    expect(reqUserStats(token)).toStrictEqual(expectedUserStats({
      numChannels: [0, 1],
      numDms: [0],
      numMessages: [0, 1],
    }, 1));
    expect(reqWorkspaceStats(token)).toStrictEqual(expectedWorkspaceStats({
      numChannels: [0, 1],
      numDms: [0],
      numMessages: [0, 1],
    }, 1));
  });

  test.skip('standup messages', async () => {
    const channelId = reqChannelsCreate(token, 'channel', true).channelId;
    reqStandupStart(token, channelId, 1.5);

    reqStandupSend(token, channelId, 'finished iteration 4');
    expect(reqUserStats(token)).toStrictEqual(expectedUserStats({
      numChannels: [0, 1],
      numDms: [0],
      numMessages: [0],
    }, 1));
    expect(reqWorkspaceStats(token)).toStrictEqual(expectedWorkspaceStats({
      numChannels: [0, 1],
      numDms: [0],
      numMessages: [0],
    }, 1));

    await new Promise(r => setTimeout(r, 1500 + DELAY));
    expect(reqUserStats(token)).toStrictEqual(expectedUserStats({
      numChannels: [0, 1],
      numDms: [0],
      numMessages: [0, 1],
    }, 1));
    expect(reqWorkspaceStats(token)).toStrictEqual(expectedWorkspaceStats({
      numChannels: [0, 1],
      numDms: [0],
      numMessages: [0, 1],
    }, 1));
  });
});
