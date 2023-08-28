import {
  BAD_REQUEST,
  FORBIDDEN,
  reqAuthRegister,
  reqChannelMessages,
  reqChannelsCreate,
  reqChannelJoin,
  reqClear,
  reqStandupStart,
  reqStandupActive,
  reqStandupSend,
  reqMessageEdit,
  reqMessageRemove,
} from '../requests';

const DELAY = 100;
beforeEach(reqClear);

describe('/standup/start/v1', () => {
  let owner: string;
  let user: string;
  let channelId: number;
  beforeEach(() => {
    owner = reqAuthRegister('email@gmail.com', 'password', 'Darci', 'Walsh').token;
    user = reqAuthRegister('email2@gmail.com', 'password', 'Cora', 'Walsh').token;
    channelId = reqChannelsCreate(owner, 'computing', true).channelId;
  });

  test('invalid token', () => {
    expect(reqStandupStart(owner + '1', channelId, 1)).toEqual(FORBIDDEN);
  });

  test('invalid channel id', () => {
    expect(reqStandupStart(owner, channelId + 1, 1)).toEqual(BAD_REQUEST);
  });

  test('invalid length', () => {
    expect(reqStandupStart(owner, channelId, -3)).toEqual(BAD_REQUEST);
  });

  test('user not a member', () => {
    expect(reqStandupStart(user, channelId, 1)).toEqual(FORBIDDEN);
  });

  test('standup already active', () => {
    reqStandupStart(owner, channelId, 1.5);
    expect(reqStandupStart(owner, channelId, 1)).toEqual(BAD_REQUEST);
    const standup = reqStandupActive(owner, channelId);
    expect(standup.timeFinish).not.toEqual(null);
    expect(standup.isActive).toStrictEqual(true);
  });

  test('correct output', () => {
    const standup = reqStandupStart(owner, channelId, 1.5);
    expect(standup).toStrictEqual({ timeFinish: expect.any(Number) });
    expect(standup.timeFinish > Date.now() / 1000).toEqual(true);
    expect(standup.timeFinish < (Date.now() / 1000) + 2).toEqual(true);
  });

  test.skip('no message sent if there are no messages', async () => {
    const newChanId = reqChannelsCreate(owner, 'mechatronics', false).channelId;
    reqStandupStart(owner, newChanId, 1);
    await new Promise(r => setTimeout(r, 1500 + DELAY));
    expect(reqChannelMessages(owner, channelId, 0).messages).toStrictEqual([]);
  });
});

describe('/standup/active/v1', () => {
  let owner: string;
  let user: string;
  let channelId: number;
  let length: number;
  let standupTime: number;
  beforeEach(() => {
    owner = reqAuthRegister('email@gmail.com', 'password', 'Darci', 'Walsh').token;
    user = reqAuthRegister('email2@gmail.com', 'password', 'Cora', 'Walsh').token;
    channelId = reqChannelsCreate(owner, 'computing', true).channelId;
    length = 1.5;
    standupTime = reqStandupStart(owner, channelId, length);
  });

  test('invalid token', () => {
    expect(reqStandupActive(owner + '1', channelId)).toEqual(FORBIDDEN);
  });

  test('invalid channel id', () => {
    expect(reqStandupActive(owner, channelId + 1)).toEqual(BAD_REQUEST);
  });

  test('user not a member', () => {
    expect(reqStandupActive(user, channelId)).toEqual(FORBIDDEN);
  });

  test('correct output', () => {
    expect(reqStandupActive(owner, channelId)).toEqual({ isActive: true, timeFinish: expect.any(Number) });
  });

  test('after standup is finished', async () => {
    expect(reqStandupActive(owner, channelId).isActive).toEqual(true);
    await new Promise(r => setTimeout(r, 1500 + DELAY));
    expect(reqStandupActive(owner, channelId).isActive).toEqual(false);
  });

  test('correct time', () => {
    const finish = reqStandupActive(owner, channelId).timeFinish;
    expect({ timeFinish: finish }).toEqual(standupTime);
  });
});

describe('/standup/send/v1', () => {
  let owner: string;
  let user: string;
  let channelId: number;
  beforeEach(() => {
    owner = reqAuthRegister('email@gmail.com', 'password', 'Darci', 'Walsh').token;
    user = reqAuthRegister('email2@gmail.com', 'password', 'Cora', 'Walsh').token;
    channelId = reqChannelsCreate(owner, 'computing', true).channelId;
    reqStandupStart(owner, channelId, 1.5);
  });

  describe('error', () => {
    test('invalid token', () => {
      expect(reqStandupSend(owner + '1', channelId, 'hello')).toEqual(FORBIDDEN);
    });

    test('invalid channel id', () => {
      expect(reqStandupSend(owner, channelId + 1, 'hello')).toEqual(BAD_REQUEST);
    });

    test('message is too long', () => {
      const message = Array(1001 + 1).join('a');
      expect(reqStandupSend(owner, channelId, message)).toEqual(BAD_REQUEST);
    });

    test('user not a member', () => {
      expect(reqStandupSend(user, channelId, 'hello')).toEqual(FORBIDDEN);
    });

    test('no standup active', () => {
      const newChanId = reqChannelsCreate(owner, 'computing', true).channelId;
      expect(reqStandupSend(owner, newChanId, 'hello')).toEqual(BAD_REQUEST);
    });
  });

  describe('valid inputs', () => {
    test('return empty object', () => {
      expect(reqStandupSend(owner, channelId, 'hello')).toStrictEqual({});
    });

    test('multiple messages sent', async () => {
      reqChannelJoin(user, channelId);
      reqStandupSend(owner, channelId, 'watched the lectures');
      reqStandupSend(user, channelId, 'i havent started');
      reqStandupSend(owner, channelId, 'finished the labs too');
      expect(reqStandupActive(owner, channelId).isActive).toStrictEqual(true);
      expect(reqChannelMessages(owner, channelId, 0).messages.length).toEqual(0);
      await new Promise(r => setTimeout(r, 1500 + DELAY));
      const standupMessage = reqChannelMessages(owner, channelId, 0).messages[0];
      expect(standupMessage.message).toEqual(
        'darciwalsh: watched the lectures\ncorawalsh: i havent started\ndarciwalsh: finished the labs too'
      );
      reqMessageEdit(owner, standupMessage.messageId, 'going to watch lectures now');
      expect(reqChannelMessages(owner, channelId, 0).messages[0].message).toEqual('going to watch lectures now');
      reqMessageRemove(owner, standupMessage.messageId);
      expect(reqChannelMessages(owner, channelId, 0).messages).toStrictEqual([]);
    });
  });
});
