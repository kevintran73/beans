import {
  BAD_REQUEST,
  FORBIDDEN,
  reqClear,
  reqAuthRegister,
  reqDMCreate,
  reqDMList,
  reqDMRemove,
  reqGetDMDetails,
  reqDMLeave,
  reqDMMessages,
  reqMessageSendDM,
} from '../requests';

beforeEach(reqClear);

describe('/dm/create', () => {
  let token: string;
  let uId: number;
  beforeEach(() => {
    token = reqAuthRegister('email@gmail.com', 'password', 'Ahmed', 'Ibrahim').token;
    uId = reqAuthRegister('email2@gmail.com', 'password', 'Ahmed', 'Ibrahim').authUserId;
  });

  test('error: invalid token', () => {
    expect(reqDMCreate(token + '1', [uId])).toEqual(FORBIDDEN);
  });

  test('error: duplicate uIds provided', () => {
    expect(reqDMCreate(token, [uId, uId])).toEqual(BAD_REQUEST);
  });

  test('error: invalid uIds provided', () => {
    expect(reqDMCreate(token, [uId + 1])).toEqual(BAD_REQUEST);
    expect(reqDMCreate(token, [uId, uId + 1])).toEqual(BAD_REQUEST);
  });

  test('creating dm with one user', () => {
    expect(reqDMCreate(token, [uId])).toStrictEqual({ dmId: expect.any(Number) });
  });

  test('creating dm with no users', () => {
    expect(reqDMCreate(token, [])).toStrictEqual({ dmId: expect.any(Number) });
  });

  test('creating dm with multiple users', () => {
    const uId1 = reqAuthRegister('email3@gmail.com', 'password', 'Ahmed', 'Ibrahim').authUserId;
    const uId2 = reqAuthRegister('email4@gmail.com', 'password', 'Ahmed', 'Ibrahim').authUserId;
    expect(reqDMCreate(token, [uId, uId1, uId2])).toStrictEqual({ dmId: expect.any(Number) });
  });

  test.skip('same user creating multiple dms', () => {
    const dm1 = reqDMCreate(token, [uId]);
    const dm2 = reqDMCreate(token, [uId]);
    expect(dm1).toStrictEqual({ dmId: expect.any(Number) });
    expect(dm2).toStrictEqual({ dmId: expect.any(Number) });
    expect(dm1.dmId).not.toEqual(dm2.dmId);
  });
});

describe('/dm/list', () => {
  let token: string;
  let dmId: number;
  beforeEach(() => {
    token = reqAuthRegister('email@gmail.com', 'password', 'Darci', 'Walsh').token;
    dmId = reqDMCreate(token, []).dmId;
  });

  test('error: invalid token', () => {
    expect(reqDMList(token + '1')).toEqual(FORBIDDEN);
  });

  describe('valid outputs', () => {
    test('no DMs', () => {
      const token2: string = reqAuthRegister('email2@gmail.com', 'password', 'Cora', 'Walsh').token;
      expect(reqDMList(token2)).toStrictEqual({ dms: [] });
    });

    test('user is a member of 1 DM and is the creator', () => {
      expect(reqDMList(token)).toStrictEqual({ dms: [{ dmId: dmId, name: 'darciwalsh' }] });
    });

    test('user is a member of multiple DMs', () => {
      const user = reqAuthRegister('email2@gmail.com', 'password', 'Cora', 'Walsh');
      const uId1 = reqAuthRegister('email3@gmail.com', 'password', 'May', 'Smith').authUserId;
      const uId2 = reqAuthRegister('email4@gmail.com', 'password', 'Angela', 'Penn').authUserId;
      const dm1 = reqDMCreate(token, [user.authUserId, uId1, uId2]).dmId;
      const dm2 = reqDMCreate(user.token, [uId1, uId2]).dmId;
      const dm3 = reqDMCreate(token, [user.authUserId]).dmId;

      const arr = reqDMList(user.token).dms;
      expect(new Set(arr)).toStrictEqual(new Set([
        { dmId: dm1, name: 'angelapenn, corawalsh, darciwalsh, maysmith' },
        { dmId: dm2, name: 'angelapenn, corawalsh, maysmith' },
        { dmId: dm3, name: 'corawalsh, darciwalsh' },
      ]));
    });
  });
});

describe('/dm/remove', () => {
  let owner: { token: string, authUserId: number };
  let nonOwner: { token: string, authUserId: number };
  let dmId: number;
  beforeEach(() => {
    owner = reqAuthRegister('email@gmail.com', 'password', 'Ahmed', 'Ibrahim');
    nonOwner = reqAuthRegister('email2@gmail.com', 'password', 'Hayden', 'Smith');
    dmId = reqDMCreate(owner.token, [nonOwner.authUserId]).dmId;
  });

  test('error: invalid token', () => {
    const invalidToken = (owner.token + '1' === nonOwner.token) ? owner.token + '2' : owner.token + '1';
    expect(reqDMRemove(invalidToken, dmId)).toEqual(FORBIDDEN);
  });

  test('error: invalid dmId', () => {
    expect(reqDMRemove(owner.token, dmId + 1)).toEqual(BAD_REQUEST);
  });

  test('error: user is not the owner of the dm', () => {
    expect(reqDMRemove(nonOwner.token, dmId)).toEqual(FORBIDDEN);
  });

  test('error: user is no longer in the dm', () => {
    reqDMLeave(owner.token, dmId);
    expect(reqDMRemove(owner.token, dmId)).toEqual(FORBIDDEN);
  });

  test('correct return of empty object', () => {
    expect(reqDMRemove(owner.token, dmId)).toStrictEqual({});
  });

  test('correct removal of dm - dmList returns empty list', () => {
    reqDMRemove(owner.token, dmId);
    expect(reqDMList(owner.token)).toStrictEqual({ dms: [] });
  });

  test('correct removal of dm - dmDetails returns an error', () => {
    reqDMRemove(owner.token, dmId);
    expect(reqGetDMDetails(owner.token, dmId)).toEqual(BAD_REQUEST);
  });

  test('accessing messages of a removed dm gives an error', () => {
    reqMessageSendDM(owner.token, dmId, 'hello');
    expect(reqDMMessages(owner.token, dmId, 0).messages[0].message).toEqual('hello');
    reqDMRemove(owner.token, dmId);
    expect(reqDMMessages(owner.token, dmId, 0)).toEqual(BAD_REQUEST);
  });
});

describe('/dm/details', () => {
  let dmId: number;
  let user: { token: string, authUserId: number };
  beforeEach(() => {
    user = reqAuthRegister('email@gmail.com', 'password', 'Darci', 'Walsh');
    dmId = reqDMCreate(user.token, []).dmId;
  });

  describe('error', () => {
    test('invalid token', () => {
      expect(reqGetDMDetails(user.token + '1', dmId)).toEqual(FORBIDDEN);
    });

    test('invalid dmId', () => {
      expect(reqGetDMDetails(user.token, dmId + 1)).toEqual(BAD_REQUEST);
    });

    test('user is not a member of the dm', () => {
      const token2: string = reqAuthRegister('email2@gmail.com', 'password', 'Cora', 'Walsh').token;
      expect(reqGetDMDetails(token2, dmId)).toEqual(FORBIDDEN);
    });
  });

  describe('valid output', () => {
    test('user is the owner of the dm', () => {
      expect(reqGetDMDetails(user.token, dmId)).toStrictEqual({
        name: 'darciwalsh',
        members: [{
          uId: user.authUserId,
          email: 'email@gmail.com',
          nameFirst: 'Darci',
          nameLast: 'Walsh',
          handleStr: 'darciwalsh',
          profileImgUrl: expect.any(String),
        }]
      });
    });

    test('user is a member but not the owner of the dm', () => {
      const user2: { token: string, authUserId: number } = reqAuthRegister('email2@gmail.com', 'password', 'Cora', 'Walsh');
      const dmId2: number = reqDMCreate(user2.token, [user.authUserId]).dmId;
      expect(reqGetDMDetails(user.token, dmId2).name).toStrictEqual('corawalsh, darciwalsh');

      const arr = reqGetDMDetails(user.token, dmId2).members;
      expect(new Set(arr)).toStrictEqual(new Set([
        {
          uId: user.authUserId,
          email: 'email@gmail.com',
          nameFirst: 'Darci',
          nameLast: 'Walsh',
          handleStr: 'darciwalsh',
          profileImgUrl: expect.any(String),
        },
        {
          uId: user2.authUserId,
          email: 'email2@gmail.com',
          nameFirst: 'Cora',
          nameLast: 'Walsh',
          handleStr: 'corawalsh',
          profileImgUrl: expect.any(String),
        }
      ]));
    });
  });
});

describe('/dm/leave', () => {
  let owner: { token: string, authUserId: number };
  let nonOwner: { token: string, authUserId: number };
  let dmId: number;
  beforeEach(() => {
    owner = reqAuthRegister('email@gmail.com', 'password', 'Ahmed', 'Ibrahim');
    nonOwner = reqAuthRegister('email2@gmail.com', 'password', 'Sienna', 'Archer');
    dmId = reqDMCreate(owner.token, [nonOwner.authUserId]).dmId;
  });

  test('error: invalid token', () => {
    const invalidToken = (owner.token + '1' === nonOwner.token) ? owner.token + '2' : owner.token + '1';
    expect(reqDMLeave(invalidToken, dmId)).toEqual(FORBIDDEN);
  });

  test('error: invalid dmId', () => {
    expect(reqDMLeave(owner.token, dmId + 1)).toEqual(BAD_REQUEST);
  });

  test('error: user in not a member of dm', () => {
    const token = reqAuthRegister('email3@gmail.com', 'password', 'non', 'member').token;
    expect(reqDMLeave(token, dmId)).toEqual(FORBIDDEN);
  });

  test('correct return of empty object', () => {
    expect(reqDMLeave(owner.token, dmId)).toStrictEqual({});
  });

  test('nonOwner leaves a dm', () => {
    reqDMLeave(nonOwner.token, dmId);
    expect(reqDMList(nonOwner.token)).toStrictEqual({ dms: [] });
    expect(reqGetDMDetails(nonOwner.token, dmId)).toEqual(FORBIDDEN);
  });

  test('owner leaves a dm', () => {
    reqDMLeave(owner.token, dmId);
    expect(reqDMList(owner.token)).toStrictEqual({ dms: [] });
    expect(reqDMRemove(owner.token, dmId)).toEqual(FORBIDDEN);
    expect(reqGetDMDetails(owner.token, dmId)).toEqual(FORBIDDEN);
    expect(reqGetDMDetails(nonOwner.token, dmId)).toStrictEqual({
      name: 'ahmedibrahim, siennaarcher',
      members: [{
        uId: nonOwner.authUserId,
        email: 'email2@gmail.com',
        nameFirst: 'Sienna',
        nameLast: 'Archer',
        handleStr: 'siennaarcher',
        profileImgUrl: expect.any(String),
      }],
    });
  });

  test.skip('all members leave a dm', () => {
    reqDMLeave(owner.token, dmId);
    reqDMLeave(nonOwner.token, dmId);
    expect(reqDMList(owner.token)).toStrictEqual({ dms: [] });
    expect(reqDMList(nonOwner.token)).toStrictEqual({ dms: [] });
    expect(reqGetDMDetails(owner.token, dmId)).toEqual(FORBIDDEN);
    expect(reqGetDMDetails(nonOwner.token, dmId)).toEqual(FORBIDDEN);
  });
});

describe('/dm/messages', () => {
  type Message = {
    message: string,
    uId: number,
    messageId: number,
    isPinned: boolean,
    reacts?: [],
    timeSent?: number,
  };
  let user: { token: string, authUserId: number };
  let dmId: number;
  beforeEach(() => {
    user = reqAuthRegister('email@gmail.com', 'password', 'Darci', 'Walsh');
    dmId = reqDMCreate(user.token, []).dmId;
  });

  describe('error', () => {
    test('invalid token', () => {
      expect(reqDMMessages(user.token + '1', dmId, 0)).toEqual(FORBIDDEN);
    });

    test('invalid dmId', () => {
      expect(reqDMMessages(user.token, dmId + 1, 0)).toEqual(BAD_REQUEST);
    });

    test('user is not a member of the dm', () => {
      const token2: string = reqAuthRegister('email2@gmail.com', 'password', 'Cora', 'Walsh').token;
      expect(reqDMMessages(token2, dmId, 0)).toEqual(FORBIDDEN);
    });

    test('start is greater than the total number of messages in the dm', () => {
      expect(reqDMMessages(user.token, dmId, 4)).toEqual(BAD_REQUEST);
    });
  });

  describe('valid output', () => {
    test('no messages', () => {
      expect(reqDMMessages(user.token, dmId, 0)).toStrictEqual({
        messages: [],
        start: 0,
        end: -1,
      });
    });

    test('start is the number of messages', () => {
      reqMessageSendDM(user.token, dmId, 'creating the first message');
      expect(reqDMMessages(user.token, dmId, 1)).toStrictEqual({
        messages: [],
        start: 1,
        end: -1,
      });
    });

    test('2 messages', () => {
      const message1: number = reqMessageSendDM(user.token, dmId, 'creating the first message').messageId;
      const message2: number = reqMessageSendDM(user.token, dmId, 'creating the second message').messageId;
      const dmMessages = reqDMMessages(user.token, dmId, 0);
      expect(dmMessages.end).toStrictEqual(-1);

      expect(dmMessages.messages).toStrictEqual([
        {
          messageId: message2,
          uId: user.authUserId,
          message: 'creating the second message',
          timeSent: expect.any(Number),
          reacts: [{ reactId: 1, uIds: [], isThisUserReacted: false }],
          isPinned: false,
        },
        {
          messageId: message1,
          uId: user.authUserId,
          message: 'creating the first message',
          timeSent: expect.any(Number),
          reacts: [{ reactId: 1, uIds: [], isThisUserReacted: false }],
          isPinned: false,
        },
      ]);
      expect(dmMessages.messages[0].timeSent).toBeGreaterThanOrEqual(dmMessages.messages[1].timeSent);
    });

    test.skip('50 messages', () => {
      const expectedMessages: Message[] = [];
      for (let i = 0; i < 50; i++) {
        const message = 'creating message ' + i;
        const { messageId } = reqMessageSendDM(user.token, dmId, message);
        expectedMessages.push({ messageId, message, uId: user.authUserId, isPinned: false });
      }
      const messages = reqDMMessages(user.token, dmId, 0);
      expect(messages.end).toEqual(-1);

      messages.messages.forEach((m: Message) => { delete (m.timeSent); delete (m.reacts); });
      expect(messages.messages).toStrictEqual(expectedMessages.reverse());
    });

    test('51 messages', () => {
      const expectedMessages: Message[] = [];
      for (let i = 0; i < 51; i++) {
        const message = 'creating message ' + i;
        const { messageId } = reqMessageSendDM(user.token, dmId, message);
        expectedMessages.push({ messageId, message, uId: user.authUserId, isPinned: false });
      }
      const messages = reqDMMessages(user.token, dmId, 0);
      expect(messages.end).toEqual(50);

      messages.messages.forEach((m: Message) => { delete (m.timeSent); delete (m.reacts); });
      expectedMessages.shift();
      expect(messages.messages).toStrictEqual(expectedMessages.reverse());
    });

    test.skip('100 messages', () => {
      const expectedMessages1: Message[] = [];
      const expectedMessages2: Message[] = [];
      for (let i = 0; i < 100; i++) {
        const message = 'creating message ' + i;
        const { messageId } = reqMessageSendDM(user.token, dmId, message);
        const expected = i < 50 ? expectedMessages2 : expectedMessages1;
        expected.push({ messageId, message, uId: user.authUserId, isPinned: false });
      }

      const messages1 = reqDMMessages(user.token, dmId, 0);
      expect(messages1.end).toEqual(50);
      messages1.messages.forEach((m: Message) => { delete (m.timeSent); delete (m.reacts); });
      expect(messages1.messages).toStrictEqual(expectedMessages1.reverse());

      const messages2 = reqDMMessages(user.token, dmId, 50);
      expect(messages2.end).toEqual(-1);
      messages2.messages.forEach((m: Message) => { delete (m.timeSent); delete (m.reacts); });
      expect(messages2.messages).toStrictEqual(expectedMessages2.reverse());
    });
  });
});
