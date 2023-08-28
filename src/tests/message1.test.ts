import {
  BAD_REQUEST,
  FORBIDDEN,
  reqClear,
  reqAuthRegister,
  reqChannelsCreate,
  reqChannelJoin,
  reqChannelInvite,
  reqChannelLeave,
  reqDMCreate,
  reqDMLeave,
  reqMessageSend,
  reqMessageSendDM,
  reqMessageSendLater,
  reqMessageSendLaterDM,
  reqMessageEdit,
  reqMessageRemove,
  reqChannelMessages,
  reqDMMessages,
  reqMessageShare,
  reqMessageReact,
  reqMessageUnreact,
  reqMessagePin,
  reqMessageUnpin,
} from '../requests';

const DELAY = 100;
beforeEach(reqClear);
const sampleUser1 = ['darci.walsh@mail.com', 'blah123', 'Darci', 'Walsh'] as const;
const sampleUser2 = ['cora.walsh@mail.com', 'something9', 'Cora', 'Walsh'] as const;
const sampleUser3 = ['brian.nhan@mail.com', 'something10', 'Brian', 'Nhan'] as const;
const publicChannel = ['Mechatronics', true] as const;
const privateChannel = ['Software', false] as const;
type ValidUser = { token: string, authUserId: number };

describe('/message/send', () => {
  let validUser: ValidUser;
  let publicChannelId: number;
  let privateChannelId: number;
  beforeEach(() => {
    validUser = reqAuthRegister(...sampleUser1);
    publicChannelId = reqChannelsCreate(validUser.token, ...publicChannel).channelId;
    privateChannelId = reqChannelsCreate(validUser.token, ...privateChannel).channelId;
  });

  describe('Error Cases', () => {
    test('invalid channel', () => {
      reqClear();
      validUser = reqAuthRegister(...sampleUser1);
      expect(reqMessageSend(validUser.token, 1, 'valid message')).toEqual(BAD_REQUEST);
    });

    test('empty message', () => {
      expect(reqMessageSend(validUser.token, publicChannelId, '')).toEqual(BAD_REQUEST);
      expect(reqMessageSend(validUser.token, privateChannelId, '')).toEqual(BAD_REQUEST);
    });

    test('>1000 character message', () => {
      expect(reqMessageSend(validUser.token, publicChannelId, 'a'.repeat(1001))).toEqual(BAD_REQUEST);
      expect(reqMessageSend(validUser.token, privateChannelId, 'a'.repeat(1001))).toEqual(BAD_REQUEST);
    });

    test('non-member sending message', () => {
      const invalidUser = reqAuthRegister(...sampleUser2);
      expect(reqMessageSend(invalidUser.token, publicChannelId, 'valid message')).toEqual(FORBIDDEN);
      expect(reqMessageSend(invalidUser.token, privateChannelId, 'valid message')).toEqual(FORBIDDEN);
    });

    test('invalid token', () => {
      expect(reqMessageSend('invalid token', publicChannelId, 'valid message')).toEqual(FORBIDDEN);
      expect(reqMessageSend('invalid token', privateChannelId, 'valid message')).toEqual(FORBIDDEN);
    });
  });

  test('succesful return type', () => {
    expect(reqMessageSend(validUser.token, publicChannelId, 'valid message')).toStrictEqual({ messageId: expect.any(Number) });
    expect(reqMessageSend(validUser.token, privateChannelId, 'valid message')).toStrictEqual({ messageId: expect.any(Number) });
  });
});

describe('/message/senddm', () => {
  let creatorUser: ValidUser;
  let memberUser: ValidUser;
  let dmId: number;
  beforeEach(() => {
    creatorUser = reqAuthRegister(...sampleUser1);
    memberUser = reqAuthRegister(...sampleUser2);
    dmId = reqDMCreate(creatorUser.token, [memberUser.authUserId]).dmId;
  });

  describe('Error Cases', () => {
    test.skip('invalid dm', () => {
      reqClear();
      const nonMemberUser = reqAuthRegister(...sampleUser3);
      expect(reqMessageSendDM(nonMemberUser.token, 1, 'valid message')).toEqual(BAD_REQUEST);
    });

    test.skip('empty message', () => {
      expect(reqMessageSendDM(creatorUser.token, dmId, '')).toEqual(BAD_REQUEST);
      expect(reqMessageSendDM(memberUser.token, dmId, '')).toEqual(BAD_REQUEST);
    });

    test.skip('>1000 character message', () => {
      expect(reqMessageSendDM(creatorUser.token, dmId, 'a'.repeat(1001))).toEqual(BAD_REQUEST);
      expect(reqMessageSendDM(memberUser.token, dmId, 'a'.repeat(1001))).toEqual(BAD_REQUEST);
    });

    test.skip('non-member sending message', () => {
      const nonMemberUser = reqAuthRegister(...sampleUser3);
      expect(reqMessageSendDM(nonMemberUser.token, dmId, 'valid message')).toEqual(FORBIDDEN);
    });

    test.skip('invalid token', () => {
      expect(reqMessageSendDM('invalid token', dmId, 'valid message')).toEqual(FORBIDDEN);
    });
  });

  test('succesful return type', () => {
    expect(reqMessageSendDM(creatorUser.token, dmId, 'valid message')).toStrictEqual({ messageId: expect.any(Number) });
    expect(reqMessageSendDM(memberUser.token, dmId, 'valid message')).toStrictEqual({ messageId: expect.any(Number) });
  });
});

describe('message/sendlater', () => {
  let user: { token: string, authUserId: number };
  let channelId: number;
  let dmId: number;
  let timeSent: number;
  beforeEach(() => {
    user = reqAuthRegister('email@gmail.com', 'password', 'Ahmed', 'Ibrahim');
    channelId = reqChannelsCreate(user.token, 'channel', true).channelId;
    dmId = reqDMCreate(user.token, []).dmId;
    timeSent = Date.now() / 1000 + 1;
  });

  test('error: timeSent is in the past', () => {
    expect(reqMessageSendLater(user.token, channelId, 'message', timeSent - 138)).toEqual(BAD_REQUEST);
  });

  test('sending a message later (channel)', async () => {
    const messageId = reqMessageSendLater(user.token, channelId, 'message', timeSent).messageId;
    expect(messageId).toEqual(expect.any(Number));
    expect(reqChannelMessages(user.token, channelId, 0).messages).toStrictEqual([]);

    await new Promise(r => setTimeout(r, 1000 + DELAY));
    expect(reqChannelMessages(user.token, channelId, 0).messages).toStrictEqual([{
      messageId,
      uId: user.authUserId,
      message: 'message',
      isPinned: false,
      reacts: expect.any(Array),
      timeSent: expect.any(Number),
    }]);
  });

  test('sending a message later (dm)', async () => {
    const messageId = reqMessageSendLaterDM(user.token, dmId, 'message', timeSent).messageId;
    expect(messageId).toEqual(expect.any(Number));
    expect(reqDMMessages(user.token, dmId, 0).messages).toStrictEqual([]);

    await new Promise(r => setTimeout(r, 1000 + DELAY));
    expect(reqDMMessages(user.token, dmId, 0).messages).toStrictEqual([{
      messageId,
      uId: user.authUserId,
      message: 'message',
      isPinned: false,
      reacts: expect.any(Array),
      timeSent: expect.any(Number),
    }]);
  });

  test.skip('editing/removing/pinning/reacting/sharing for future messages -> error', async () => {
    const messageId = reqMessageSendLater(user.token, channelId, 'message', timeSent).messageId;
    expect(reqMessageEdit(user.token, messageId, 'better message')).toEqual(BAD_REQUEST);
    expect(reqMessageRemove(user.token, messageId)).toEqual(BAD_REQUEST);
    expect(reqMessagePin(user.token, messageId)).toEqual(BAD_REQUEST);
    expect(reqMessageUnpin(user.token, messageId)).toEqual(BAD_REQUEST);
    expect(reqMessageReact(user.token, messageId, 1)).toEqual(BAD_REQUEST);
    expect(reqMessageUnreact(user.token, messageId, 1)).toEqual(BAD_REQUEST);
    expect(reqMessageShare(user.token, messageId, -1, dmId, 'look at this')).toEqual(BAD_REQUEST);
    await new Promise(r => setTimeout(r, 1500 + DELAY));
  });
});

describe('/message/edit', () => {
  let creatorUser: ValidUser;
  let memberUser: ValidUser;
  let dmId: number;
  let publicChannelId: number;
  let privateChannelId: number;
  beforeEach(() => {
    creatorUser = reqAuthRegister(...sampleUser1);
    memberUser = reqAuthRegister(...sampleUser2);

    dmId = reqDMCreate(creatorUser.token, [memberUser.authUserId]).dmId;

    publicChannelId = reqChannelsCreate(creatorUser.token, ...publicChannel).channelId;
    reqChannelJoin(memberUser.token, publicChannelId);

    privateChannelId = reqChannelsCreate(creatorUser.token, ...privateChannel).channelId;
    reqChannelInvite(creatorUser.token, privateChannelId, memberUser.authUserId);
  });

  describe('Error Cases', () => {
    test('invalid token', () => {
      const dmMessageId = reqMessageSendDM(creatorUser.token, dmId, 'valid message').messageId;
      expect(reqMessageEdit('invalid token', dmMessageId, 'valid edit')).toEqual(FORBIDDEN);

      const pubChannelMessageId = reqMessageSend(creatorUser.token, publicChannelId, 'valid message').messageId;
      expect(reqMessageEdit('invalid token', pubChannelMessageId, 'valid edit')).toEqual(FORBIDDEN);

      const privChannelMessageId = reqMessageSend(creatorUser.token, privateChannelId, 'valid message').messageId;
      expect(reqMessageEdit('invalid token', privChannelMessageId, 'valid edit')).toEqual(FORBIDDEN);
    });

    test('message > 1000 characters', () => {
      const dmMessageId = reqMessageSendDM(creatorUser.token, dmId, 'valid message').messageId;
      expect(reqMessageEdit(creatorUser.token, dmMessageId, 'a'.repeat(1001))).toEqual(BAD_REQUEST);
    });

    test('non-member request', () => {
      const dmMessageId = reqMessageSendDM(memberUser.token, dmId, 'valid message').messageId;
      reqDMLeave(memberUser.token, dmId);
      expect(reqMessageEdit(memberUser.token, dmMessageId, 'valid edit')).toEqual(BAD_REQUEST);

      const pubChannelMessageId = reqMessageSend(memberUser.token, publicChannelId, 'valid message').messageId;
      reqChannelLeave(memberUser.token, publicChannelId);
      expect(reqMessageEdit(memberUser.token, pubChannelMessageId, 'valid edit')).toEqual(BAD_REQUEST);

      const privChannelMessageId = reqMessageSend(memberUser.token, privateChannelId, 'valid message').messageId;
      reqChannelLeave(memberUser.token, privateChannelId);
      expect(reqMessageEdit(memberUser.token, privChannelMessageId, 'valid edit')).toEqual(BAD_REQUEST);
    });

    test('non-owner request', () => {
      const dmMessageId = reqMessageSendDM(creatorUser.token, dmId, 'valid message').messageId;
      expect(reqMessageEdit(memberUser.token, dmMessageId, 'valid edit')).toEqual(FORBIDDEN);

      const pubChannelMessageId = reqMessageSend(creatorUser.token, publicChannelId, 'valid message').messageId;
      expect(reqMessageEdit(memberUser.token, pubChannelMessageId, 'valid edit')).toEqual(FORBIDDEN);

      const privChannelMessageId = reqMessageSend(creatorUser.token, privateChannelId, 'valid message').messageId;
      expect(reqMessageEdit(memberUser.token, privChannelMessageId, 'valid edit')).toEqual(FORBIDDEN);
    });
  });

  describe('succesful return type', () => {
    test('empty string', () => {
      const dmMessageId = reqMessageSendDM(creatorUser.token, dmId, 'valid message').messageId;
      expect(reqMessageEdit(creatorUser.token, dmMessageId, '')).toStrictEqual({});

      const pubChannelMessageId = reqMessageSend(creatorUser.token, publicChannelId, 'valid message').messageId;
      expect(reqMessageEdit(creatorUser.token, pubChannelMessageId, '')).toStrictEqual({});

      const privChannelMessageId = reqMessageSend(creatorUser.token, privateChannelId, 'valid message').messageId;
      expect(reqMessageEdit(creatorUser.token, privChannelMessageId, '')).toStrictEqual({});
    });

    test('self-change and owner-change', () => {
      let dmMessageId = reqMessageSendDM(memberUser.token, dmId, 'valid message').messageId;
      expect(reqMessageEdit(memberUser.token, dmMessageId, 'valid edit')).toStrictEqual({});
      dmMessageId = reqMessageSendDM(memberUser.token, dmId, 'valid message').messageId;
      expect(reqMessageEdit(creatorUser.token, dmMessageId, 'valid edit')).toStrictEqual({});

      let pubChannelMessageId = reqMessageSend(memberUser.token, publicChannelId, 'valid message').messageId;
      expect(reqMessageEdit(memberUser.token, pubChannelMessageId, 'valid edit')).toStrictEqual({});
      pubChannelMessageId = reqMessageSend(memberUser.token, publicChannelId, 'valid message').messageId;
      expect(reqMessageEdit(creatorUser.token, pubChannelMessageId, 'valid edit')).toStrictEqual({});

      // let privChannelMessageId = reqMessageSend(memberUser.token, privateChannelId, 'valid message').messageId;
      // expect(reqMessageEdit(memberUser.token, privChannelMessageId, 'valid edit')).toStrictEqual({});
      // privChannelMessageId = reqMessageSend(memberUser.token, publicChannelId, 'valid message').messageId;
      // expect(reqMessageEdit(creatorUser.token, privChannelMessageId, 'valid edit')).toStrictEqual({});
    });
  });
});

describe('/message/remove', () => {
  let creatorUser: ValidUser;
  let memberUser: ValidUser;
  let dmId: number;
  let publicChannelId: number;
  let privateChannelId: number;
  beforeEach(() => {
    creatorUser = reqAuthRegister(...sampleUser1);
    memberUser = reqAuthRegister(...sampleUser2);

    dmId = reqDMCreate(creatorUser.token, [memberUser.authUserId]).dmId;

    publicChannelId = reqChannelsCreate(creatorUser.token, ...publicChannel).channelId;
    reqChannelJoin(memberUser.token, publicChannelId);

    privateChannelId = reqChannelsCreate(creatorUser.token, ...privateChannel).channelId;
    reqChannelInvite(creatorUser.token, privateChannelId, memberUser.authUserId);
  });

  describe('Error Cases', () => {
    test('invalid token', () => {
      const dmMessageId = reqMessageSendDM(creatorUser.token, dmId, 'valid message').messageId;
      expect(reqMessageRemove('invalid token', dmMessageId)).toEqual(FORBIDDEN);

      const pubChannelMessageId = reqMessageSend(creatorUser.token, publicChannelId, 'valid message').messageId;
      expect(reqMessageRemove('invalid token', pubChannelMessageId)).toEqual(FORBIDDEN);

      const privChannelMessageId = reqMessageSend(creatorUser.token, privateChannelId, 'valid message').messageId;
      expect(reqMessageRemove('invalid token', privChannelMessageId)).toEqual(FORBIDDEN);
    });

    test('nonexistant message', () => {
      expect(reqMessageRemove(creatorUser.token, 1)).toEqual(BAD_REQUEST);
      expect(reqMessageRemove(memberUser.token, 1)).toEqual(BAD_REQUEST);
    });

    test('non-member request', () => {
      const dmMessageId = reqMessageSendDM(memberUser.token, dmId, 'valid message').messageId;
      reqDMLeave(memberUser.token, dmId);
      expect(reqMessageRemove(memberUser.token, dmMessageId)).toEqual(BAD_REQUEST);

      const pubChannelMessageId = reqMessageSend(memberUser.token, publicChannelId, 'valid message').messageId;
      reqChannelLeave(memberUser.token, publicChannelId);
      expect(reqMessageRemove(memberUser.token, pubChannelMessageId)).toEqual(BAD_REQUEST);

      const privChannelMessageId = reqMessageSend(memberUser.token, privateChannelId, 'valid message').messageId;
      reqChannelLeave(memberUser.token, privateChannelId);
      expect(reqMessageRemove(memberUser.token, privChannelMessageId)).toEqual(BAD_REQUEST);
    });

    test('non-owner request', () => {
      const dmMessageId = reqMessageSendDM(creatorUser.token, dmId, 'valid message').messageId;
      expect(reqMessageRemove(memberUser.token, dmMessageId)).toEqual(FORBIDDEN);

      const pubChannelMessageId = reqMessageSend(creatorUser.token, publicChannelId, 'valid message').messageId;
      expect(reqMessageRemove(memberUser.token, pubChannelMessageId)).toEqual(FORBIDDEN);

      const privChannelMessageId = reqMessageSend(creatorUser.token, privateChannelId, 'valid message').messageId;
      expect(reqMessageRemove(memberUser.token, privChannelMessageId)).toEqual(FORBIDDEN);
    });
  });

  test('succesful return type', () => {
    let dmMessageId = reqMessageSendDM(memberUser.token, dmId, 'valid message').messageId;
    expect(reqMessageRemove(memberUser.token, dmMessageId)).toStrictEqual({});
    dmMessageId = reqMessageSendDM(memberUser.token, dmId, 'valid message').messageId;
    expect(reqMessageRemove(creatorUser.token, dmMessageId)).toStrictEqual({});

    let pubChannelMessageId = reqMessageSend(memberUser.token, publicChannelId, 'valid message').messageId;
    expect(reqMessageRemove(memberUser.token, pubChannelMessageId)).toStrictEqual({});
    pubChannelMessageId = reqMessageSend(memberUser.token, publicChannelId, 'valid message').messageId;
    expect(reqMessageRemove(creatorUser.token, pubChannelMessageId)).toStrictEqual({});

    let privChannelMessageId = reqMessageSend(memberUser.token, privateChannelId, 'valid message').messageId;
    expect(reqMessageRemove(memberUser.token, privChannelMessageId)).toStrictEqual({});
    privChannelMessageId = reqMessageSend(memberUser.token, publicChannelId, 'valid message').messageId;
    expect(reqMessageRemove(creatorUser.token, privChannelMessageId)).toStrictEqual({});
  });
});
