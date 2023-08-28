import {
  BAD_REQUEST,
  FORBIDDEN,
  reqClear,
  reqAuthRegister,
  reqChannelsCreate,
  reqChannelJoin,
  reqChannelInvite,
  reqChannelMessages,
  reqChannelLeave,
  reqDMCreate,
  reqDMMessages,
  reqDMLeave,
  reqMessageSendDM,
  reqMessageSend,
  reqMessageSearch,
  reqMessageShare,
  reqMessageReact,
  reqMessageUnreact,
  reqMessagePin,
  reqMessageUnpin,
  reqMessageSendLater
} from '../requests';

const DELAY = 100;
beforeEach(reqClear);
const sampleUser1 = ['darci.walsh@mail.com', 'blah123', 'Darci', 'Walsh'] as const;
const sampleUser2 = ['cora.walsh@mail.com', 'something9', 'Cora', 'Walsh'] as const;
const sampleUser3 = ['brian.nhan@mail.com', 'something10', 'Brian', 'Nhan'] as const;
const publicChannel = ['Mechatronics', true] as const;
const privateChannel = ['Software', false] as const;
type ValidUser = { token: string, authUserId: number };

describe('/search/v1', () => {
  let validUser: ValidUser;
  let publicChannelId: number;
  beforeEach(() => {
    validUser = reqAuthRegister(...sampleUser1);
    publicChannelId = reqChannelsCreate(validUser.token, ...publicChannel).channelId;
  });

  test('invalid token', () => {
    expect(reqMessageSearch('invalid token', 'validquery')).toEqual(FORBIDDEN);
  });

  test('invalid query string', () => {
    expect(reqMessageSearch(validUser.token, '')).toEqual(BAD_REQUEST);
  });

  test('user not in any channel -> return empty array', () => {
    const validUser2 = reqAuthRegister(...sampleUser2);
    expect(reqMessageSearch(validUser2.token, 'hello')).toStrictEqual({ messages: [] });
  });

  test('user in a channel with no messages -> return empty array', () => {
    expect(reqMessageSearch(validUser.token, 'hello')).toStrictEqual({ messages: [] });
  });

  test('searching for future messages', async () => {
    const message = reqMessageSendLater(validUser.token, publicChannelId, 'hello', Date.now() / 1000 + 1.5);
    expect(reqMessageSearch(validUser.token, 'hello')).toStrictEqual({ messages: [] });
    await new Promise(r => setTimeout(r, 1500 + DELAY));
    expect(reqMessageSearch(validUser.token, 'hello')).toStrictEqual(
      {
        messages: [{
          messageId: message.messageId,
          uId: validUser.authUserId,
          message: 'hello',
          timeSent: expect.any(Number),
          reacts: expect.any(Array),
          isPinned: expect.any(Boolean),
        }]
      }
    );
  });

  test('successful return of messages containing query string in one channel', () => {
    const message1 = reqMessageSend(validUser.token, publicChannelId, 'vAlid message');
    const message2 = reqMessageSend(validUser.token, publicChannelId, 'hoW are you all?');
    const message3 = reqMessageSend(validUser.token, publicChannelId, 'beaUtiful day');
    const message4 = reqMessageSend(validUser.token, publicChannelId, 'i cant Believe it');

    expect(reqMessageSearch(validUser.token, 'hello')).toStrictEqual({ messages: [] });
    expect(reqMessageSearch(validUser.token, 'valid')).toStrictEqual(
      {
        messages: [{
          messageId: message1.messageId,
          uId: validUser.authUserId,
          message: 'vAlid message',
          timeSent: expect.any(Number),
          reacts: expect.any(Array),
          isPinned: expect.any(Boolean),
        }]
      }
    );
    expect(reqMessageSearch(validUser.token, 'how')).toStrictEqual(
      {
        messages: [{
          messageId: message2.messageId,
          uId: validUser.authUserId,
          message: 'hoW are you all?',
          timeSent: expect.any(Number),
          reacts: expect.any(Array),
          isPinned: expect.any(Boolean),
        }]
      }
    );
    expect(reqMessageSearch(validUser.token, 'beautiful')).toStrictEqual(
      {
        messages: [{
          messageId: message3.messageId,
          uId: validUser.authUserId,
          message: 'beaUtiful day',
          timeSent: expect.any(Number),
          reacts: expect.any(Array),
          isPinned: expect.any(Boolean),
        }]
      }
    );
    expect(reqMessageSearch(validUser.token, 'believe')).toStrictEqual(
      {
        messages: [{
          messageId: message4.messageId,
          uId: validUser.authUserId,
          message: 'i cant Believe it',
          timeSent: expect.any(Number),
          reacts: expect.any(Array),
          isPinned: expect.any(Boolean),
        }]
      }
    );
    expect(new Set(reqMessageSearch(validUser.token, 'I').messages)).toStrictEqual(new Set([
      {
        messageId: message1.messageId,
        uId: validUser.authUserId,
        message: 'vAlid message',
        timeSent: expect.any(Number),
        reacts: expect.any(Array),
        isPinned: expect.any(Boolean),
      },
      {
        messageId: message3.messageId,
        uId: validUser.authUserId,
        message: 'beaUtiful day',
        timeSent: expect.any(Number),
        reacts: expect.any(Array),
        isPinned: expect.any(Boolean),
      },
      {
        messageId: message4.messageId,
        uId: validUser.authUserId,
        message: 'i cant Believe it',
        timeSent: expect.any(Number),
        reacts: expect.any(Array),
        isPinned: expect.any(Boolean),
      },
    ]));
  });

  test.skip('successful return of messages by multiple users in multiple channels/DMs', () => {
    const privChannelId = reqChannelsCreate(validUser.token, ...privateChannel).channelId;
    const validUser2 = reqAuthRegister(...sampleUser2);
    const dmId = reqDMCreate(validUser.token, [validUser2.authUserId]).dmId;
    reqChannelInvite(validUser.token, privChannelId, validUser2.authUserId);
    const message1 = reqMessageSend(validUser.token, publicChannelId, 'hello wOrld');
    const message2 = reqMessageSend(validUser2.token, privChannelId, 'hello People');
    const message3 = reqMessageSendDM(validUser2.token, dmId, 'hello everybodY');
    expect(reqMessageSearch(validUser.token, 'world')).toStrictEqual({
      messages: [{
        messageId: message1.messageId,
        uId: validUser.authUserId,
        message: 'hello wOrld',
        timeSent: expect.any(Number),
        reacts: expect.any(Array),
        isPinned: expect.any(Boolean),
      }]
    });
    expect(reqMessageSearch(validUser2.token, 'world')).toStrictEqual({ messages: [] });
    expect(reqMessageSearch(validUser.token, 'people')).toStrictEqual({
      messages: [{
        messageId: message2.messageId,
        uId: validUser2.authUserId,
        message: 'hello People',
        timeSent: expect.any(Number),
        reacts: expect.any(Array),
        isPinned: expect.any(Boolean),
      }]
    });
    expect(reqMessageSearch(validUser2.token, 'people')).toStrictEqual({
      messages: [{
        messageId: message2.messageId,
        uId: validUser2.authUserId,
        message: 'hello People',
        timeSent: expect.any(Number),
        reacts: expect.any(Array),
        isPinned: expect.any(Boolean),
      }]
    });
    expect(reqMessageSearch(validUser.token, 'everybody')).toStrictEqual({
      messages: [{
        messageId: message3.messageId,
        uId: validUser2.authUserId,
        message: 'hello everybodY',
        timeSent: expect.any(Number),
        reacts: expect.any(Array),
        isPinned: expect.any(Boolean),
      }]
    });
    expect(reqMessageSearch(validUser2.token, 'everybody')).toStrictEqual({
      messages: [{
        messageId: message3.messageId,
        uId: validUser2.authUserId,
        message: 'hello everybodY',
        timeSent: expect.any(Number),
        reacts: expect.any(Array),
        isPinned: expect.any(Boolean),
      }]
    });
    expect(new Set(reqMessageSearch(validUser.token, 'hello').messages)).toStrictEqual(new Set([
      {
        messageId: message1.messageId,
        uId: validUser.authUserId,
        message: 'hello wOrld',
        timeSent: expect.any(Number),
        reacts: expect.any(Array),
        isPinned: expect.any(Boolean),
      },
      {
        messageId: message2.messageId,
        uId: validUser2.authUserId,
        message: 'hello People',
        timeSent: expect.any(Number),
        reacts: expect.any(Array),
        isPinned: expect.any(Boolean),
      },
      {
        messageId: message3.messageId,
        uId: validUser2.authUserId,
        message: 'hello everybodY',
        timeSent: expect.any(Number),
        reacts: expect.any(Array),
        isPinned: expect.any(Boolean),
      },
    ]));
    expect(new Set(reqMessageSearch(validUser2.token, 'hello').messages)).toStrictEqual(new Set([
      {
        messageId: message2.messageId,
        uId: validUser2.authUserId,
        message: 'hello People',
        timeSent: expect.any(Number),
        reacts: expect.any(Array),
        isPinned: expect.any(Boolean),
      },
      {
        messageId: message3.messageId,
        uId: validUser2.authUserId,
        message: 'hello everybodY',
        timeSent: expect.any(Number),
        reacts: expect.any(Array),
        isPinned: expect.any(Boolean),
      },
    ]));
  });
});

describe('/message/share/v1', () => {
  let validUser: ValidUser;
  let validUser2: ValidUser;
  let publicChannelId: number;
  let dmId: number;
  beforeEach(() => {
    validUser = reqAuthRegister(...sampleUser1);
    validUser2 = reqAuthRegister(...sampleUser2);
    publicChannelId = reqChannelsCreate(validUser.token, ...publicChannel).channelId;
    expect(reqChannelJoin(validUser2.token, publicChannelId)).toStrictEqual({});
    dmId = reqDMCreate(validUser.token, [validUser2.authUserId]).dmId;
  });

  test('invalid token: channel', () => {
    const messageId = reqMessageSend(validUser.token, publicChannelId, 'vAlid message').messageId;
    expect(reqMessageShare('token', messageId, publicChannelId, -1, 'message')).toEqual(FORBIDDEN);
  });
  test('invalid token: dm', () => {
    const messageId = reqMessageSend(validUser.token, publicChannelId, 'vAlid message').messageId;
    expect(reqMessageShare('token', messageId, -1, dmId, 'message')).toEqual(FORBIDDEN);
  });

  test('>1000 message: channel', () => {
    const messageId = reqMessageSend(validUser.token, publicChannelId, 'vAlid message').messageId;
    expect(reqMessageShare(validUser.token, messageId, publicChannelId, -1, 'a'.repeat(1001))).toEqual(BAD_REQUEST);
  });
  test.skip('>1000 message: dm', () => {
    const messageId = reqMessageSend(validUser.token, publicChannelId, 'vAlid message').messageId;
    expect(reqMessageShare(validUser.token, messageId, -1, dmId, 'a'.repeat(1001))).toEqual(BAD_REQUEST);
  });

  test('both invalid target', () => {
    const messageId = reqMessageSend(validUser.token, publicChannelId, 'vAlid message').messageId;
    expect(reqMessageShare(validUser.token, messageId, -1, -1, 'message')).toEqual(BAD_REQUEST);
  });
  test('no -1 input', () => {
    const messageId = reqMessageSend(validUser.token, publicChannelId, 'vAlid message').messageId;
    expect(reqMessageShare(validUser.token, messageId, publicChannelId, dmId, 'message')).toEqual(BAD_REQUEST);
  });

  test.skip('non-existant ogMessage: channel', () => {
    expect(reqMessageShare(validUser.token, 1, publicChannelId, -1, 'message')).toEqual(BAD_REQUEST);
  });
  test('non-existant ogMessage: dm', () => {
    expect(reqMessageShare(validUser.token, 1, -1, dmId, 'message')).toEqual(BAD_REQUEST);
  });

  test('not member of ogMessage channel: channel', () => {
    const messageId = reqMessageSend(validUser.token, publicChannelId, 'vAlid message').messageId;
    const targetChannelId = reqChannelsCreate(validUser.token, ...publicChannel).channelId;
    const validUser3 = reqAuthRegister(...sampleUser3);
    expect(reqChannelJoin(validUser3.token, targetChannelId)).toStrictEqual({});
    expect(reqMessageShare(validUser3.token, messageId, targetChannelId, -1, 'message')).toEqual(BAD_REQUEST);
  });
  test.skip('not member of ogMessage channel: dm', () => {
    const messageId = reqMessageSend(validUser.token, publicChannelId, 'vAlid message').messageId;
    const validUser3 = reqAuthRegister(...sampleUser3);
    const targetDmId = reqDMCreate(validUser.token, [validUser3.authUserId]).dmId;
    expect(reqMessageShare(validUser3.token, messageId, -1, targetDmId, 'message')).toEqual(BAD_REQUEST);
  });

  test.skip('not member of ogMessage dmId: channel', () => {
    const messageId = reqMessageSendDM(validUser.token, dmId, 'vAlid message').messageId;
    const targetChannelId = reqChannelsCreate(validUser.token, ...publicChannel).channelId;
    const validUser3 = reqAuthRegister(...sampleUser3);
    expect(reqChannelJoin(validUser3.token, targetChannelId)).toStrictEqual({});
    expect(reqMessageShare(validUser3.token, messageId, targetChannelId, -1, 'message')).toEqual(BAD_REQUEST);
  });
  test('not member of ogMessage dmId: dm', () => {
    const messageId = reqMessageSendDM(validUser.token, dmId, 'vAlid message').messageId;
    const validUser3 = reqAuthRegister(...sampleUser3);
    const targetDmId = reqDMCreate(validUser.token, [validUser3.authUserId]).dmId;
    expect(reqMessageShare(validUser3.token, messageId, -1, targetDmId, 'message')).toEqual(BAD_REQUEST);
  });

  test('non-existant target: channel', () => {
    const messageId = reqMessageSend(validUser.token, publicChannelId, 'vAlid message').messageId;
    expect(reqMessageShare(validUser.token, messageId, 1, -1, 'message')).toEqual(BAD_REQUEST);
  });

  test.skip('non-existant target: dm', () => {
    const messageId = reqMessageSend(validUser.token, publicChannelId, 'vAlid message').messageId;
    expect(reqMessageShare(validUser.token, messageId, -1, 1, 'message')).toEqual(BAD_REQUEST);
  });

  test('not member of target: channel', () => {
    const messageId = reqMessageSend(validUser.token, publicChannelId, 'vAlid message').messageId;
    const validUser3 = reqAuthRegister(...sampleUser3);
    expect(reqChannelJoin(validUser3.token, publicChannelId)).toStrictEqual({});
    const targetChannelId = reqChannelsCreate(validUser.token, ...publicChannel).channelId;
    expect(reqMessageShare(validUser3.token, messageId, targetChannelId, -1, 'message')).toEqual(FORBIDDEN);
  });

  test.skip('not member of target: dm', () => {
    const messageId = reqMessageSend(validUser.token, publicChannelId, 'vAlid message').messageId;
    const validUser3 = reqAuthRegister(...sampleUser3);
    expect(reqChannelJoin(validUser3.token, publicChannelId)).toStrictEqual({});
    expect(reqMessageShare(validUser3.token, messageId, -1, dmId, 'message')).toEqual(FORBIDDEN);
  });

  test.skip('valid: channel', () => {
    const messageId = reqMessageSend(validUser.token, publicChannelId, 'vAlid mEssage').messageId;
    expect(reqMessageShare(validUser.token, messageId, publicChannelId, -1, 'message')).toStrictEqual({
      sharedMessageId: expect.any(Number),
    });
    const messages = reqChannelMessages(validUser.token, publicChannelId, 0).messages;
    expect(messages[1].message).toStrictEqual('vAlid mEssage');
    expect(messages[0].message).toContain('vAlid mEssage');
    expect(messages[0].message).toContain('message');
  });

  test('valid: dm', () => {
    const messageId = reqMessageSend(validUser.token, publicChannelId, 'vAlid mEssage').messageId;
    expect(reqMessageShare(validUser.token, messageId, -1, dmId, 'message')).toStrictEqual({
      sharedMessageId: expect.any(Number),
    });
    const messages = reqDMMessages(validUser.token, dmId, 0).messages;
    expect(messages[0].message).toContain('vAlid mEssage');
    expect(messages[0].message).toContain('message');
  });

  test('valid no message: channel', () => {
    const messageId = reqMessageSend(validUser.token, publicChannelId, 'vAlid mEssage').messageId;
    expect(reqMessageShare(validUser.token, messageId, publicChannelId, -1)).toStrictEqual({
      sharedMessageId: expect.any(Number),
    });
    const messages = reqChannelMessages(validUser.token, publicChannelId, 0).messages;
    expect(messages[1].message).toStrictEqual('vAlid mEssage');
    expect(messages[0].message).toContain('vAlid mEssage');
  });

  test.skip('valid no message: dm', () => {
    const messageId = reqMessageSend(validUser.token, publicChannelId, 'vAlid mEssage').messageId;
    expect(reqMessageShare(validUser.token, messageId, -1, dmId, 'message')).toStrictEqual({
      sharedMessageId: expect.any(Number),
    });
    const messages = reqDMMessages(validUser.token, dmId, 0).messages;
    expect(messages[0].message).toContain('vAlid mEssage');
  });
});

describe('/message/react/v1', () => {
  let validUser: ValidUser;
  let publicChannelId: number;
  beforeEach(() => {
    validUser = reqAuthRegister(...sampleUser1);
    publicChannelId = reqChannelsCreate(validUser.token, ...publicChannel).channelId;
  });

  test('invalid token', () => {
    const pubChannelMessageId = reqMessageSend(validUser.token, publicChannelId, 'valid message').messageId;
    expect(reqMessageReact('invalid token', pubChannelMessageId, 1)).toEqual(FORBIDDEN);
  });

  test('invalid message id', () => {
    expect(reqMessageReact(validUser.token, 1, 1)).toEqual(BAD_REQUEST);
  });

  test('valid message not in channel that auth user is a member of', () => {
    const pubChannelMessageId = reqMessageSend(validUser.token, publicChannelId, 'valid message').messageId;
    const validUser2 = reqAuthRegister(...sampleUser2);
    expect(reqMessageReact(validUser2.token, pubChannelMessageId, 1)).toEqual(BAD_REQUEST);
  });

  test('valid message not in dm that auth user is a member of', () => {
    const validUser2 = reqAuthRegister(...sampleUser2);
    const dmId = reqDMCreate(validUser.token, [validUser2.authUserId]).dmId;
    const dmMessageId = reqMessageSend(validUser.token, dmId, 'valid message').messageId;
    const validUser3 = reqAuthRegister(...sampleUser3);
    expect(reqMessageReact(validUser3.token, dmMessageId, 1)).toEqual(BAD_REQUEST);
  });

  test('message already reacted', () => {
    const pubChannelMessageId = reqMessageSend(validUser.token, publicChannelId, 'valid message').messageId;
    expect(reqMessageReact(validUser.token, pubChannelMessageId, 1)).toStrictEqual({});
    expect(reqMessageReact(validUser.token, pubChannelMessageId, 1)).toEqual(BAD_REQUEST);
  });

  test('invalid reactId', () => {
    const pubChannelMessageId = reqMessageSend(validUser.token, publicChannelId, 'valid message').messageId;
    expect(reqMessageReact(validUser.token, pubChannelMessageId, 0)).toEqual(BAD_REQUEST);
  });

  describe('valid react cases', () => {
    test('first react', () => {
      const pubChannelMessageId = reqMessageSend(validUser.token, publicChannelId, 'valid message').messageId;
      expect(reqMessageReact(validUser.token, pubChannelMessageId, 1)).toEqual({});
    });

    test('second react', () => {
      const pubChannelMessageId = reqMessageSend(validUser.token, publicChannelId, 'valid message').messageId;
      const validUser2 = reqAuthRegister(...sampleUser2);
      reqChannelJoin(validUser2.token, publicChannelId);
      expect(reqMessageReact(validUser.token, pubChannelMessageId, 1)).toEqual({});
      expect(reqMessageReact(validUser2.token, pubChannelMessageId, 1)).toEqual({});
    });

    test('person reacting to message in channel that sender is no longer in (for notifications)', () => {
      const pubChannelMessageId = reqMessageSend(validUser.token, publicChannelId, 'valid message').messageId;
      const validUser2 = reqAuthRegister(...sampleUser2);
      reqChannelJoin(validUser2.token, publicChannelId);
      reqChannelLeave(validUser.token, publicChannelId);
      expect(reqMessageReact(validUser2.token, pubChannelMessageId, 1)).toEqual({});
    });
  });
});

describe('/message/unreact/v1', () => {
  let validUser: ValidUser;
  let publicChannelId: number;
  beforeEach(() => {
    validUser = reqAuthRegister(...sampleUser1);
    publicChannelId = reqChannelsCreate(validUser.token, ...publicChannel).channelId;
  });

  test('invalid token', () => {
    const pubChannelMessageId = reqMessageSend(validUser.token, publicChannelId, 'valid message').messageId;
    expect(reqMessageReact(validUser.token, pubChannelMessageId, 1)).toEqual({});
    expect(reqMessageUnreact('invalid token', pubChannelMessageId, 1)).toEqual(FORBIDDEN);
  });

  test('invalid reactID', () => {
    const pubChannelMessageId = reqMessageSend(validUser.token, publicChannelId, 'valid message').messageId;
    expect(reqMessageReact(validUser.token, pubChannelMessageId, 1)).toEqual({});
    expect(reqMessageUnreact(validUser.token, pubChannelMessageId, 0)).toEqual(BAD_REQUEST);
  });

  test('invalid message id', () => {
    expect(reqMessageUnreact(validUser.token, 1, 1)).toEqual(BAD_REQUEST);
  });

  test('valid message not in channel that auth user is a member of', () => {
    const pubChannelMessageId = reqMessageSend(validUser.token, publicChannelId, 'valid message').messageId;
    const validUser2 = reqAuthRegister(...sampleUser2);
    reqChannelJoin(validUser2.token, publicChannelId);
    expect(reqMessageReact(validUser2.token, pubChannelMessageId, 1)).toEqual({});
    reqChannelLeave(validUser2.token, publicChannelId);
    expect(reqMessageUnreact(validUser2.token, pubChannelMessageId, 1)).toEqual(BAD_REQUEST);
  });

  test('valid message not in dm that auth user is a member of', () => {
    const validUser2 = reqAuthRegister(...sampleUser2);
    const dmId = reqDMCreate(validUser.token, [validUser2.authUserId]).dmId;

    const dmMessageId = reqMessageSendDM(validUser.token, dmId, 'valid message').messageId;
    expect(reqMessageReact(validUser2.token, dmMessageId, 1)).toEqual({});
    reqDMLeave(validUser2.token, dmId);

    expect(reqMessageUnreact(validUser2.token, dmMessageId, 1)).toEqual(BAD_REQUEST);
  });

  test('message hasnt been reacted with', () => {
    const pubChannelMessageId = reqMessageSend(validUser.token, publicChannelId, 'valid message').messageId;
    expect(reqMessageUnreact(validUser.token, pubChannelMessageId, 1)).toEqual(BAD_REQUEST);
  });

  test('valid case', () => {
    const pubChannelMessageId = reqMessageSend(validUser.token, publicChannelId, 'valid message').messageId;
    expect(reqMessageReact(validUser.token, pubChannelMessageId, 1)).toEqual({});
    expect(reqMessageUnreact(validUser.token, pubChannelMessageId, 1)).toEqual({});
  });
});

describe('/message/pin/v1', () => {
  let validUser: ValidUser;
  let publicChannelId: number;
  beforeEach(() => {
    validUser = reqAuthRegister(...sampleUser1);
    publicChannelId = reqChannelsCreate(validUser.token, ...publicChannel).channelId;
  });

  test('invalid token', () => {
    const pubChannelMessageId = reqMessageSend(validUser.token, publicChannelId, 'valid message').messageId;
    expect(reqMessagePin('invalid token', pubChannelMessageId)).toEqual(FORBIDDEN);
  });

  test('invalid message id', () => {
    expect(reqMessagePin(validUser.token, 1)).toEqual(BAD_REQUEST);
  });

  test('valid message not in channel/DM that auth user is a member of', () => {
    const pubChannelMessageId = reqMessageSend(validUser.token, publicChannelId, 'valid message').messageId;
    const validUser2 = reqAuthRegister(...sampleUser2);
    reqChannelsCreate(validUser2.token, ...privateChannel);
    expect(reqMessagePin(validUser2.token, pubChannelMessageId)).toEqual(BAD_REQUEST);
  });

  test('message already pinned', () => {
    const pubChannelMessageId = reqMessageSend(validUser.token, publicChannelId, 'valid message').messageId;
    expect(reqMessagePin(validUser.token, pubChannelMessageId)).toStrictEqual({});
    expect(reqMessagePin(validUser.token, pubChannelMessageId)).toEqual(BAD_REQUEST);
  });

  test('auth user does not have owner permissions in the channel', () => {
    const pubChannelMessageId = reqMessageSend(validUser.token, publicChannelId, 'valid message').messageId;
    const validUser2 = reqAuthRegister(...sampleUser2);
    reqChannelJoin(validUser2.token, publicChannelId);
    expect(reqMessagePin(validUser2.token, pubChannelMessageId)).toEqual(FORBIDDEN);
  });

  test('message gets pinned successfully in channel', () => {
    const pubChannelMessageId = reqMessageSend(validUser.token, publicChannelId, 'valid message').messageId;
    expect(reqMessagePin(validUser.token, pubChannelMessageId)).toStrictEqual({});
    expect(reqMessageUnpin(validUser.token, pubChannelMessageId)).toStrictEqual({});
  });

  test('message gets pinned successfully in DM', () => {
    const validUser2 = reqAuthRegister(...sampleUser2);
    const dmId = reqDMCreate(validUser.token, [validUser2.authUserId]).dmId;
    const dmMessageId = reqMessageSendDM(validUser2.token, dmId, 'valid message').messageId;
    expect(reqMessagePin(validUser.token, dmMessageId)).toStrictEqual({});
    expect(reqMessageUnpin(validUser.token, dmMessageId)).toStrictEqual({});
  });

  test('global owner pinning message', () => {
    const validUser2 = reqAuthRegister(...sampleUser2);
    const privateChannelId = reqChannelsCreate(validUser2.token, ...privateChannel).channelId;
    expect(reqChannelJoin(validUser.token, privateChannelId)).toStrictEqual({});
    const privChannelMessageId = reqMessageSend(validUser.token, privateChannelId, 'valid message').messageId;
    expect(reqMessagePin(validUser.token, privChannelMessageId)).toStrictEqual({});
    expect(reqMessageUnpin(validUser.token, privChannelMessageId)).toStrictEqual({});
  });
});

describe('/message/unpin/v1', () => {
  let validUser: ValidUser;
  let publicChannelId: number;
  let pubChannelMessageId: number;
  beforeEach(() => {
    validUser = reqAuthRegister(...sampleUser1);
    publicChannelId = reqChannelsCreate(validUser.token, ...publicChannel).channelId;
    pubChannelMessageId = reqMessageSend(validUser.token, publicChannelId, 'valid message').messageId;
    reqMessagePin(validUser.token, pubChannelMessageId);
  });

  test('invalid token', () => {
    expect(reqMessageUnpin('invalid token', pubChannelMessageId)).toEqual(FORBIDDEN);
  });

  test('invalid message id', () => {
    expect(reqMessageUnpin(validUser.token, pubChannelMessageId - 1)).toEqual(BAD_REQUEST);
  });

  test('valid message not in channel/DM that auth user is a member of', () => {
    const validUser2 = reqAuthRegister(...sampleUser2);
    reqChannelsCreate(validUser2.token, ...privateChannel);
    expect(reqMessageUnpin(validUser2.token, pubChannelMessageId)).toEqual(BAD_REQUEST);
  });

  test('message already not pinned', () => {
    const newMessageId = reqMessageSend(validUser.token, publicChannelId, 'hello world').messageId;
    expect(reqMessageUnpin(validUser.token, newMessageId)).toEqual(BAD_REQUEST);
  });

  test('auth user does not have owner permissions in the chat', () => {
    const validUser2 = reqAuthRegister(...sampleUser2);
    reqChannelJoin(validUser2.token, publicChannelId);
    expect(reqMessageUnpin(validUser2.token, pubChannelMessageId)).toEqual(FORBIDDEN);
  });

  test('double unpin on same message', () => {
    expect(reqMessageUnpin(validUser.token, pubChannelMessageId)).toEqual({});
    expect(reqMessageUnpin(validUser.token, pubChannelMessageId)).toEqual(BAD_REQUEST);
  });

  test('message gets unpinned successfully in channel', () => {
    expect(reqMessageUnpin(validUser.token, pubChannelMessageId)).toStrictEqual({});
    expect(reqMessagePin(validUser.token, pubChannelMessageId)).toStrictEqual({});
  });

  test('message gets unpinned succesfully in dm', () => {
    const validUser2 = reqAuthRegister(...sampleUser2);
    const dmId = reqDMCreate(validUser.token, [validUser2.authUserId]).dmId;
    const dmMessageId = reqMessageSendDM(validUser2.token, dmId, 'valid message').messageId;
    expect(reqMessagePin(validUser.token, dmMessageId)).toStrictEqual({});
    expect(reqMessageUnpin(validUser.token, dmMessageId)).toStrictEqual({});
    expect(reqMessagePin(validUser.token, dmMessageId)).toStrictEqual({});
  });

  test.skip('global owner unpinning message', () => {
    const validUser2 = reqAuthRegister(...sampleUser2);
    const privateChannelId = reqChannelsCreate(validUser2.token, ...privateChannel).channelId;
    expect(reqChannelJoin(validUser.token, privateChannelId)).toStrictEqual({});
    const privChannelMessageId = reqMessageSend(validUser.token, privateChannelId, 'valid message').messageId;
    expect(reqMessagePin(validUser.token, privChannelMessageId)).toStrictEqual({});
    expect(reqMessageUnpin(validUser.token, privChannelMessageId)).toStrictEqual({});
    expect(reqMessagePin(validUser.token, privChannelMessageId)).toStrictEqual({});
  });
});
