import {
  BAD_REQUEST,
  FORBIDDEN,
  reqClear,
  reqAuthRegister,
  reqChannelsCreate,
  reqChannelsList,
  reqChannelDetails,
  reqChannelJoin,
  reqChannelInvite,
  reqChannelMessages,
  reqChannelLeave,
  reqChannelAddOwner,
  reqChannelRemoveOwner,
  reqMessageSend,
  reqStandupStart,
} from '../requests';

const DELAY = 150;
beforeEach(reqClear);

describe('/channel/details', () => {
  test('invalid channelId', () => {
    const user = reqAuthRegister('kevin.tran@hotmail.com', '123456', 'Kevin', 'Tran');
    expect(reqChannelDetails(user.token, 999)).toEqual(BAD_REQUEST);
  });

  test('invalid token', () => {
    const user = reqAuthRegister('kevin.tran@hotmail.com', '123456', 'Kevin', 'Tran');
    const channel = reqChannelsCreate(user.token, 'COMP1511', false);
    expect(reqChannelDetails(user.token + 1, channel.channelId)).toEqual(FORBIDDEN);
  });

  test('invalid member of channel', () => {
    const user1 = reqAuthRegister('kevin.tran@hotmail.com', '123456', 'Kevin', 'Tran');
    const user2 = reqAuthRegister('k.t@gmail.com', '123456', 'K', 'T');
    const channel = reqChannelsCreate(user1.token, 'COMP1511', false);
    expect(reqChannelDetails(user2.token, channel.channelId)).toEqual(FORBIDDEN);
  });

  test('valid member of existing channel (correct input/output)', () => {
    const user = reqAuthRegister('kevin.tran@hotmail.com', '123456', 'Kevin', 'Tran');
    const channel = reqChannelsCreate(user.token, 'COMP1511', false);
    expect(reqChannelDetails(user.token, channel.channelId)).toStrictEqual({
      name: 'COMP1511',
      isPublic: false,
      ownerMembers: [{
        uId: user.authUserId,
        email: 'kevin.tran@hotmail.com',
        nameFirst: 'Kevin',
        nameLast: 'Tran',
        handleStr: 'kevintran',
        profileImgUrl: expect.any(String),
      }],
      allMembers: [{
        uId: user.authUserId,
        email: 'kevin.tran@hotmail.com',
        nameFirst: 'Kevin',
        nameLast: 'Tran',
        handleStr: 'kevintran',
        profileImgUrl: expect.any(String),
      }],
    });
  });
});

describe('/channel/join', () => {
  const user1 = ['email@gmail.com', 'password', 'Ahmed', 'Ibrahim'] as const;
  const user2 = ['email@hotmail.com', 'password', 'Zach', 'Ahmed'] as const;
  const publicCh = ['Computer-Science', true] as const;
  const privateCh = ['Computer-Engineering', false] as const;

  describe('error handling', () => {
    test('invalid token or channelId', () => {
      const validToken = reqAuthRegister(...user1).token;
      const validChannelId = reqChannelsCreate(validToken, ...publicCh).channelId;
      expect(reqChannelJoin(validToken + '1', validChannelId + 1)).toEqual(FORBIDDEN);
      expect(reqChannelJoin(validToken, validChannelId + 1)).toEqual(BAD_REQUEST);
      expect(reqChannelJoin(validToken + '1', validChannelId)).toEqual(FORBIDDEN);
    });

    test('user already belongs to the channel', () => {
      const token = reqAuthRegister(...user1).token;
      const channelId = reqChannelsCreate(token, ...publicCh).channelId;
      expect(reqChannelJoin(token, channelId)).toEqual(BAD_REQUEST);
    });

    test('global member joining a private channel', () => {
      const globalOwner = reqAuthRegister(...user1).token;
      const privateChannel = reqChannelsCreate(globalOwner, ...privateCh).channelId;
      const globalMember = reqAuthRegister(...user2).token;
      expect(reqChannelJoin(globalMember, privateChannel)).toEqual(FORBIDDEN);
    });
  });

  describe('correct functionality', () => {
    test('correct return (empty object)', () => {
      const globalOwner = reqAuthRegister(...user1).token;
      const chan = reqChannelsCreate(globalOwner, ...publicCh).channelId;
      const user = reqAuthRegister(...user2).token;
      expect(reqChannelJoin(user, chan)).toStrictEqual({});
    });

    test('global member joining public channel', () => {
      const globalOwner = reqAuthRegister(...user1).token;
      const publicChannel = reqChannelsCreate(globalOwner, ...publicCh).channelId;
      const globalMember = reqAuthRegister(...user2).token;
      reqChannelJoin(globalMember, publicChannel);
      expect(reqChannelsList(globalMember)).toStrictEqual({
        channels: [{ channelId: publicChannel, name: publicCh[0] }]
      });
    });

    test('global owner joining public channel', () => {
      const globalOwner = reqAuthRegister(...user1).token;
      const authUser = reqAuthRegister(...user2).token;
      const publicChannel = reqChannelsCreate(authUser, ...publicCh).channelId;
      reqChannelJoin(globalOwner, publicChannel);
      expect(reqChannelsList(globalOwner)).toStrictEqual({
        channels: [{ channelId: publicChannel, name: publicCh[0] }]
      });
    });

    test.skip('global owner joining private channel', () => {
      const globalOwner = reqAuthRegister(...user1).token;
      const authUser = reqAuthRegister(...user2).token;
      const privateChannel = reqChannelsCreate(authUser, ...privateCh).channelId;
      reqChannelJoin(globalOwner, privateChannel);
      expect(reqChannelsList(globalOwner)).toStrictEqual({
        channels: [{ channelId: privateChannel, name: privateCh[0] }]
      });
    });

    test.skip('global member joining multiple (public) channels', () => {
      const authUser = reqAuthRegister(...user1).token;
      const channel0 = reqChannelsCreate(authUser, ...publicCh).channelId;
      const channel1 = reqChannelsCreate(authUser, 'public1', true).channelId;
      const channel2 = reqChannelsCreate(authUser, 'public2', true).channelId;

      const globalMember = reqAuthRegister(...user2).token;
      reqChannelJoin(globalMember, channel0);
      reqChannelJoin(globalMember, channel1);
      reqChannelJoin(globalMember, channel2);

      const channels = reqChannelsList(globalMember).channels;
      expect(new Set(channels)).toStrictEqual(new Set([
        { channelId: channel0, name: publicCh[0] },
        { channelId: channel1, name: 'public1' },
        { channelId: channel2, name: 'public2' }
      ]));
    });

    test.skip('global owner joining multiple (public/private) channels', () => {
      const globalOwner = reqAuthRegister(...user1).token;
      const authUser = reqAuthRegister(...user2).token;
      const channel0 = reqChannelsCreate(authUser, ...publicCh).channelId;
      const channel1 = reqChannelsCreate(authUser, ...privateCh).channelId;
      const channel2 = reqChannelsCreate(authUser, 'public', true).channelId;
      const channel3 = reqChannelsCreate(authUser, 'private', false).channelId;

      reqChannelJoin(globalOwner, channel0);
      reqChannelJoin(globalOwner, channel1);
      reqChannelJoin(globalOwner, channel2);
      reqChannelJoin(globalOwner, channel3);

      const channels = reqChannelsList(globalOwner).channels;
      expect(new Set(channels)).toStrictEqual(new Set([
        { channelId: channel0, name: publicCh[0] },
        { channelId: channel1, name: privateCh[0] },
        { channelId: channel2, name: 'public' },
        { channelId: channel3, name: 'private' }
      ]));
    });

    test.skip('multiple global members joining one (public) channel', () => {
      const authUser = reqAuthRegister(...user1);
      const publicChannel = reqChannelsCreate(authUser.token, ...publicCh).channelId;

      const withoutEmail = ['password', 'Ahmed', 'Ibrahim'] as const;
      const member1 = reqAuthRegister('member1@gmail.com', ...withoutEmail);
      const member2 = reqAuthRegister('member2@gmail.com', ...withoutEmail);
      const member3 = reqAuthRegister('member3@gmail.com', ...withoutEmail);
      const member4 = reqAuthRegister('member4@gmail.com', ...withoutEmail);
      reqChannelJoin(member1.token, publicChannel);
      reqChannelJoin(member2.token, publicChannel);
      reqChannelJoin(member3.token, publicChannel);
      reqChannelJoin(member4.token, publicChannel);

      const names = { nameFirst: user1[2], nameLast: user1[3] };
      const channelMembers = reqChannelDetails(authUser.token, publicChannel).allMembers;
      expect(new Set(channelMembers)).toStrictEqual(new Set([
        { uId: authUser.authUserId, email: user1[0], ...names, handleStr: 'ahmedibrahim', profileImgUrl: expect.any(String) },
        { uId: member1.authUserId, email: 'member1@gmail.com', ...names, handleStr: 'ahmedibrahim0', profileImgUrl: expect.any(String) },
        { uId: member2.authUserId, email: 'member2@gmail.com', ...names, handleStr: 'ahmedibrahim1', profileImgUrl: expect.any(String) },
        { uId: member3.authUserId, email: 'member3@gmail.com', ...names, handleStr: 'ahmedibrahim2', profileImgUrl: expect.any(String) },
        { uId: member4.authUserId, email: 'member4@gmail.com', ...names, handleStr: 'ahmedibrahim3', profileImgUrl: expect.any(String) },
      ]));
    });
  });
});

describe('/channel/invite', () => {
  const user1 = ['email@gmail.com', 'password', 'Ahmed', 'Ibrahim'] as const;
  const user2 = ['hayden.smith@pearler.com', 'password', 'Hayden', 'Smith'] as const;
  const publicCh = ['arts', true] as const;
  const privateCh = ['law', false] as const;

  describe('error handling', () => {
    test('invalid token or user ID', () => {
      const user = reqAuthRegister(...user1);
      const chanId = reqChannelsCreate(user.token, ...publicCh).channelId;
      expect(reqChannelInvite(user.token + '1', chanId, user.authUserId + 1)).toEqual(FORBIDDEN);
      expect(reqChannelInvite(user.token + '1', chanId, user.authUserId)).toEqual(FORBIDDEN);
      expect(reqChannelInvite(user.token, chanId, user.authUserId + 1)).toEqual(BAD_REQUEST);
    });

    test('invalid channel ID', () => {
      const token = reqAuthRegister(...user1).token;
      const validUId = reqAuthRegister(...user2).authUserId;
      expect(reqChannelInvite(token, 0, validUId)).toEqual(BAD_REQUEST);
    });

    test('user being invited is already a channel member', () => {
      const inviter = reqAuthRegister(...user1).token;
      const invitee = reqAuthRegister(...user2);
      const chan = reqChannelsCreate(inviter, ...publicCh).channelId;
      reqChannelJoin(invitee.token, chan);
      expect(reqChannelInvite(inviter, chan, invitee.authUserId)).toEqual(BAD_REQUEST);
    });

    test('user sending the invite is not a channel member', () => {
      const token = reqAuthRegister('em@gmail.com', 'password', 'a', 'b').token;
      const chan = reqChannelsCreate(token, ...publicCh).channelId;
      const inviter = reqAuthRegister(...user1).token;
      const invitee = reqAuthRegister(...user2).authUserId;
      expect(reqChannelInvite(inviter, chan, invitee)).toEqual(FORBIDDEN);
    });
  });

  describe('correct functionality', () => {
    test('correct return (empty object)', () => {
      const inviter = reqAuthRegister(...user1).token;
      const invitee = reqAuthRegister(...user2).authUserId;
      const chan = reqChannelsCreate(inviter, ...publicCh).channelId;
      expect(reqChannelInvite(inviter, chan, invitee)).toStrictEqual({});
    });

    test('inviting one user to a public channel', () => {
      const inviter = reqAuthRegister(...user1).token;
      const invitee = reqAuthRegister(...user2);
      const chan = reqChannelsCreate(inviter, ...publicCh).channelId;

      expect(reqChannelsList(invitee.token)).toStrictEqual({ channels: [] });
      reqChannelInvite(inviter, chan, invitee.authUserId);
      expect(reqChannelsList(invitee.token)).toStrictEqual({
        channels: [{ channelId: chan, name: publicCh[0] }]
      });
    });

    test.skip('inviting one user to a private channel', () => {
      const inviter = reqAuthRegister(...user1).token;
      const invitee = reqAuthRegister(...user2);
      const chan = reqChannelsCreate(inviter, ...privateCh).channelId;

      expect(reqChannelsList(invitee.token)).toStrictEqual({ channels: [] });
      reqChannelInvite(inviter, chan, invitee.authUserId);
      expect(reqChannelsList(invitee.token)).toStrictEqual({
        channels: [{ channelId: chan, name: privateCh[0] }]
      });
    });

    test.skip('inviting one user to multiple channels', () => {
      const inviter = reqAuthRegister(...user1).token;
      const invitee = reqAuthRegister(...user2);
      const chan0 = reqChannelsCreate(inviter, ...publicCh).channelId;
      const chan1 = reqChannelsCreate(inviter, ...privateCh).channelId;
      const chan2 = reqChannelsCreate(inviter, 'channel', true).channelId;
      reqChannelInvite(inviter, chan0, invitee.authUserId);
      reqChannelInvite(inviter, chan1, invitee.authUserId);
      reqChannelInvite(inviter, chan2, invitee.authUserId);

      const channels = reqChannelsList(invitee.token).channels;
      expect(new Set(channels)).toStrictEqual(new Set([
        { channelId: chan0, name: publicCh[0] },
        { channelId: chan1, name: privateCh[0] },
        { channelId: chan2, name: 'channel' }
      ]));
    });

    test.skip('inviting multiple users to one channel', () => {
      const authUser = reqAuthRegister(...user1);
      const chanId = reqChannelsCreate(authUser.token, ...publicCh).channelId;

      const [email, ...withoutEmail] = user1;
      const userId0 = reqAuthRegister('email0@gmail.com', ...withoutEmail).authUserId;
      const userId1 = reqAuthRegister('email1@gmail.com', ...withoutEmail).authUserId;
      const userId2 = reqAuthRegister('email2@gmail.com', ...withoutEmail).authUserId;
      const userId3 = reqAuthRegister('email3@gmail.com', ...withoutEmail).authUserId;
      reqChannelInvite(authUser.token, chanId, userId0);
      reqChannelInvite(authUser.token, chanId, userId1);
      reqChannelInvite(authUser.token, chanId, userId2);
      reqChannelInvite(authUser.token, chanId, userId3);

      const names = { nameFirst: user1[2], nameLast: user1[3] };
      const members = reqChannelDetails(authUser.token, chanId).allMembers;
      expect(new Set(members)).toStrictEqual(new Set([
        { uId: authUser.authUserId, email: email, ...names, handleStr: 'ahmedibrahim', profileImgUrl: expect.any(String) },
        { uId: userId1, email: 'email1@gmail.com', ...names, handleStr: 'ahmedibrahim1', profileImgUrl: expect.any(String) },
        { uId: userId0, email: 'email0@gmail.com', ...names, handleStr: 'ahmedibrahim0', profileImgUrl: expect.any(String) },
        { uId: userId2, email: 'email2@gmail.com', ...names, handleStr: 'ahmedibrahim2', profileImgUrl: expect.any(String) },
        { uId: userId3, email: 'email3@gmail.com', ...names, handleStr: 'ahmedibrahim3', profileImgUrl: expect.any(String) },
      ]));
    });
  });
});

describe('/channel/messages', () => {
  const sampleUser1 = ['brian.nhan@mail.com', 'blah123', 'Brian', 'Nhan'] as const;
  const sampleUser2 = ['cora.walsh@mail.com', 'something9', 'Cora', 'Walsh'] as const;

  test('start greater than number of messages', () => {
    const token = reqAuthRegister(...sampleUser1).token;
    const validChannel = reqChannelsCreate(token, 'mechatronics', true).channelId;
    expect(reqChannelMessages(token, validChannel, 1)).toEqual(BAD_REQUEST);
  });

  test('non-existant user', () => {
    const token = reqAuthRegister(...sampleUser1).token;
    const validChannel = reqChannelsCreate(token, 'mechatronics', false).channelId;
    expect(reqChannelMessages(token + '1', validChannel, 0)).toEqual(FORBIDDEN);
  });

  test('non-existent channel', () => {
    const token = reqAuthRegister(...sampleUser1).token;
    const validChannel = reqChannelsCreate(token, 'mechatronics', true).channelId;
    expect(reqChannelMessages(token, validChannel + 1, 0)).toEqual(BAD_REQUEST);
  });

  test('non-member query', () => {
    const token = reqAuthRegister(...sampleUser2).token;
    const validChannel = reqChannelsCreate(token, 'mechatronics', false).channelId;
    const invalidToken = reqAuthRegister(...sampleUser1).token;
    expect(reqChannelMessages(invalidToken, validChannel, 0)).toEqual(FORBIDDEN);
  });

  test('correct return type of no messages', () => {
    const token = reqAuthRegister(...sampleUser2).token;
    const validChannel = reqChannelsCreate(token, 'mechatronics', true).channelId;
    expect(reqChannelMessages(token, validChannel, 0)).toStrictEqual(
      {
        messages: [],
        start: 0,
        end: -1,
      });
  });

  test.skip('correct return type (with messages)', () => {
    const user = reqAuthRegister(...sampleUser1);
    const { channelId } = reqChannelsCreate(user.token, 'mechatronics', true);

    type Message = {
      message: string,
      uId: number,
      messageId: number,
      isPinned: boolean,
      timeSent?: number,
      reacts?: [],
    };
    const expectedMessages: Message[] = [];
    for (let i = 0; i < 50; i++) {
      const message = 'message ' + i;
      const { messageId } = reqMessageSend(user.token, channelId, message);
      expectedMessages.push({ message, messageId, uId: user.authUserId, isPinned: false });
    }
    const messages = reqChannelMessages(user.token, channelId, 0);

    expect(messages.start).toEqual(0);
    expect(messages.end).toEqual(-1);
    messages.messages.forEach((m: Message) => { delete (m.timeSent); delete (m.reacts); });
    expect(messages.messages).toStrictEqual(expectedMessages.reverse());
  });
});

describe('/channel/leave', () => {
  test('invalid channelId', () => {
    const user = reqAuthRegister('kevin.tran@hotmail.com', '123456', 'Kevin', 'Tran');
    expect(reqChannelLeave(user.token, 999)).toEqual(BAD_REQUEST);
  });

  test('invalid member of channel', () => {
    const user1 = reqAuthRegister('kevin.tran@hotmail.com', '123456', 'Kevin', 'Tran');
    const user2 = reqAuthRegister('k.t@gmail.com', '123456', 'K', 'T');
    const channel = reqChannelsCreate(user1.token, 'COMP1511', false);
    expect(reqChannelLeave(user2.token, channel.channelId)).toEqual(FORBIDDEN);
  });

  test('invalid token', () => {
    const user = reqAuthRegister('kevin.tran@hotmail.com', '123456', 'Kevin', 'Tran');
    const channel = reqChannelsCreate(user.token, 'COMP1511', false);
    expect(reqChannelLeave(user.token + 1, channel.channelId)).toEqual(FORBIDDEN);
  });

  test('user is the starter of an active standup', async () => {
    const user = reqAuthRegister('kevin.tran@hotmail.com', '123456', 'Kevin', 'Tran');
    const channel = reqChannelsCreate(user.token, 'COMP1511', false);
    reqStandupStart(user.token, channel.channelId, 1.5);
    expect(reqChannelLeave(user.token, channel.channelId)).toEqual(BAD_REQUEST);
    await new Promise(r => setTimeout(r, 1500 + DELAY));
  });

  test.skip('channel member leaving the channel', () => {
    const user1 = reqAuthRegister('kevin.tran@hotmail.com', '123456', 'Kevin', 'Tran');
    const user2 = reqAuthRegister('k.t@gmail.com', '123456', 'K', 'T');
    const channel = reqChannelsCreate(user1.token, 'COMP1511', true);
    reqChannelJoin(user2.token, channel.channelId);
    expect(reqChannelsList(user2.token)).toStrictEqual({
      channels: [{ channelId: channel.channelId, name: 'COMP1511' }]
    });
    expect(reqChannelLeave(user2.token, channel.channelId)).toStrictEqual({});
    expect(reqChannelsList(user2.token)).toStrictEqual({ channels: [] });
    expect(reqChannelDetails(user1.token, channel.channelId)).toStrictEqual({
      name: 'COMP1511',
      isPublic: true,
      ownerMembers: [{
        uId: user1.authUserId,
        email: 'kevin.tran@hotmail.com',
        nameFirst: 'Kevin',
        nameLast: 'Tran',
        handleStr: 'kevintran',
        profileImgUrl: expect.any(String),
      }],
      allMembers: [{
        uId: user1.authUserId,
        email: 'kevin.tran@hotmail.com',
        nameFirst: 'Kevin',
        nameLast: 'Tran',
        handleStr: 'kevintran',
        profileImgUrl: expect.any(String),
      }],
    });
  });

  test('channel owner leaving the channel', () => {
    const user1 = reqAuthRegister('kevin.tran@hotmail.com', '123456', 'Kevin', 'Tran');
    const user2 = reqAuthRegister('k.t@gmail.com', '123456', 'K', 'T');
    const channel = reqChannelsCreate(user1.token, 'COMP1511', true);
    reqChannelJoin(user2.token, channel.channelId);
    reqChannelAddOwner(user2.token, channel.channelId, user2.authUserId);
    reqChannelLeave(user2.token, channel.channelId);
    expect(reqChannelsList(user2.token)).toStrictEqual({ channels: [] });
    expect(reqChannelDetails(user1.token, channel.channelId)).toStrictEqual({
      name: 'COMP1511',
      isPublic: true,
      ownerMembers: [{
        uId: user1.authUserId,
        email: 'kevin.tran@hotmail.com',
        nameFirst: 'Kevin',
        nameLast: 'Tran',
        handleStr: 'kevintran',
        profileImgUrl: expect.any(String),
      }],
      allMembers: [{
        uId: user1.authUserId,
        email: 'kevin.tran@hotmail.com',
        nameFirst: 'Kevin',
        nameLast: 'Tran',
        handleStr: 'kevintran',
        profileImgUrl: expect.any(String),
      }],
    });
  });

  test.skip('the sole channel owner leaving the channel', () => {
    const user1 = reqAuthRegister('kevin.tran@hmail.com', '123456', 'Kevin', 'Tran');
    const user2 = reqAuthRegister('k.t@fmail.com', '123456', 'K', 'T');
    const channel = reqChannelsCreate(user1.token, 'COMP1511', true);
    reqChannelJoin(user2.token, channel.channelId);
    reqChannelLeave(user1.token, channel.channelId);
    expect(reqChannelsList(user1.token)).toStrictEqual({ channels: [] });
    expect(reqChannelDetails(user2.token, channel.channelId)).toStrictEqual({
      name: 'COMP1511',
      isPublic: true,
      ownerMembers: [],
      allMembers: [{
        uId: user2.authUserId,
        email: 'k.t@fmail.com',
        nameFirst: 'K',
        nameLast: 'T',
        handleStr: 'kt',
        profileImgUrl: expect.any(String),
      }],
    });
  });

  test.skip('global owner leaving the private channel', () => {
    const user1 = reqAuthRegister('kevin.tran@hotmail.com', '123456', 'Kevin', 'Tran');
    const user2 = reqAuthRegister('k.t@gmail.com', '123456', 'K', 'T');
    const channel = reqChannelsCreate(user2.token, 'COMP1511', false);
    reqChannelJoin(user1.token, channel.channelId);
    reqChannelLeave(user1.token, channel.channelId);
    expect(reqChannelsList(user1.token)).toStrictEqual({ channels: [] });
    expect(reqChannelDetails(user2.token, channel.channelId)).toStrictEqual({
      name: 'COMP1511',
      isPublic: false,
      ownerMembers: [{
        uId: user2.authUserId,
        email: 'k.t@gmail.com',
        nameFirst: 'K',
        nameLast: 'T',
        handleStr: 'kt',
        profileImgUrl: expect.any(String),
      }],
      allMembers: [{
        uId: user2.authUserId,
        email: 'k.t@gmail.com',
        nameFirst: 'K',
        nameLast: 'T',
        handleStr: 'kt',
        profileImgUrl: expect.any(String),
      }],
    });
  });

  test.skip('all members and owners leaving the channel', () => {
    const user1 = reqAuthRegister('kevin.tran@hotmail.com', '123456', 'Kevin', 'Tran');
    const user2 = reqAuthRegister('k.t@gmail.com', '123456', 'K', 'T');
    const channel = reqChannelsCreate(user1.token, 'COMP1511', true);
    reqChannelJoin(user2.token, channel.channelId);
    expect(reqChannelLeave(user1.token, channel.channelId)).toStrictEqual({});
    expect(reqChannelLeave(user2.token, channel.channelId)).toStrictEqual({});
    expect(reqChannelsList(user1.token)).toStrictEqual({ channels: [] });
    expect(reqChannelsList(user2.token)).toStrictEqual({ channels: [] });
  });

  test.skip('user messages remain in server after leaving', () => {
    const user1 = reqAuthRegister('kevin.tran@hotmail.com', '123456', 'Kevin', 'Tran');
    const user2 = reqAuthRegister('k.t@gmail.com', '123456', 'K', 'T');
    const channel = reqChannelsCreate(user1.token, 'COMP1511', true);
    reqChannelJoin(user2.token, channel.channelId);
    const { messageId: id1 } = reqMessageSend(user2.token, channel.channelId, 'hello world!');
    const { messageId: id2 } = reqMessageSend(user1.token, channel.channelId, 'how are you?');
    reqChannelLeave(user2.token, channel.channelId);
    expect(reqChannelMessages(user1.token, channel.channelId, 0)).toStrictEqual({
      messages: [
        {
          messageId: id2,
          uId: user1.authUserId,
          message: 'how are you?',
          timeSent: expect.any(Number),
          reacts: [{ reactId: 1, uIds: [], isThisUserReacted: false }],
          isPinned: false,
        },
        {
          messageId: id1,
          uId: user2.authUserId,
          message: 'hello world!',
          timeSent: expect.any(Number),
          reacts: [{ reactId: 1, uIds: [], isThisUserReacted: false }],
          isPinned: false,
        },
      ],
      start: 0,
      end: -1,
    });
  });
});

describe('/channel/addowner', () => {
  test('invalid token', () => {
    const user1 = reqAuthRegister('kevin.tran@hotmail.com', '123456', 'Kevin', 'Tran');
    const user2 = reqAuthRegister('k.t@gmail.com', '123456', 'K', 'T');
    const channel = reqChannelsCreate(user1.token, 'COMP1511', true);
    reqChannelJoin(user2.token, channel.channelId);
    expect(reqChannelAddOwner(user1.token + 1, channel.channelId, user2.authUserId)).toEqual(FORBIDDEN);
  });

  test('invalid channelId', () => {
    const user1 = reqAuthRegister('kevin.tran@hotmail.com', '123456', 'Kevin', 'Tran');
    const user2 = reqAuthRegister('k.t@gmail.com', '123456', 'K', 'T');
    const channel = reqChannelsCreate(user1.token, 'COMP1511', true);
    reqChannelJoin(user2.token, channel.channelId);
    expect(reqChannelAddOwner(user1.token, channel.channelId + 1, user2.authUserId)).toEqual(BAD_REQUEST);
  });

  test('invalid uId', () => {
    const user1 = reqAuthRegister('kevin.tran@hotmail.com', '123456', 'Kevin', 'Tran');
    const user2 = reqAuthRegister('k.t@gmail.com', '123456', 'K', 'T');
    const channel = reqChannelsCreate(user1.token, 'COMP1511', true);
    reqChannelJoin(user2.token, channel.channelId);
    expect(reqChannelAddOwner(user1.token, channel.channelId, user2.authUserId + 1)).toEqual(BAD_REQUEST);
  });

  test('uId refers to user who is not a member of the channel', () => {
    const user1 = reqAuthRegister('kevin.tran@hotmail.com', '123456', 'Kevin', 'Tran');
    const user2 = reqAuthRegister('k.t@gmail.com', '123456', 'K', 'T');
    const channel = reqChannelsCreate(user1.token, 'COMP1511', true);
    expect(reqChannelAddOwner(user1.token, channel.channelId, user2.authUserId)).toEqual(BAD_REQUEST);
  });

  test('uId refers to user who is already an owner of the channel', () => {
    const user1 = reqAuthRegister('kevin.tran@hotmail.com', '123456', 'Kevin', 'Tran');
    const channel = reqChannelsCreate(user1.token, 'COMP1511', true);
    expect(reqChannelAddOwner(user1.token, channel.channelId, user1.authUserId)).toEqual(BAD_REQUEST);
  });

  test('channelId is valid but authorised user does not have owner perms in the channel', () => {
    const user1 = reqAuthRegister('kevin.tran@hotmail.com', '123456', 'Kevin', 'Tran');
    const user2 = reqAuthRegister('k.t@gmail.com', '123456', 'K', 'T');
    const channel = reqChannelsCreate(user1.token, 'COMP1511', true);
    reqChannelJoin(user2.token, channel.channelId);
    expect(reqChannelAddOwner(user2.token, channel.channelId, user2.authUserId)).toEqual(FORBIDDEN);
  });

  test('successfully made member an owner of the channel', () => {
    const user1 = reqAuthRegister('kevin.tran@hotmail.com', '123456', 'Kevin', 'Tran');
    const user2 = reqAuthRegister('k.t@gmail.com', '123456', 'K', 'T');
    const channel = reqChannelsCreate(user1.token, 'COMP1511', true);
    reqChannelJoin(user2.token, channel.channelId);
    expect(reqChannelAddOwner(user1.token, channel.channelId, user2.authUserId)).toStrictEqual({});
    const result = reqChannelDetails(user2.token, channel.channelId);
    expect(result.name).toStrictEqual('COMP1511');
    expect(result.isPublic).toStrictEqual(true);
    expect(new Set(result.ownerMembers)).toStrictEqual(new Set([
      {
        uId: user1.authUserId,
        email: 'kevin.tran@hotmail.com',
        nameFirst: 'Kevin',
        nameLast: 'Tran',
        handleStr: 'kevintran',
        profileImgUrl: expect.any(String),
      },
      {
        uId: user2.authUserId,
        email: 'k.t@gmail.com',
        nameFirst: 'K',
        nameLast: 'T',
        handleStr: 'kt',
        profileImgUrl: expect.any(String),
      }
    ]));
    expect(new Set(result.allMembers)).toStrictEqual(new Set([
      {
        uId: user1.authUserId,
        email: 'kevin.tran@hotmail.com',
        nameFirst: 'Kevin',
        nameLast: 'Tran',
        handleStr: 'kevintran',
        profileImgUrl: expect.any(String),
      },
      {
        uId: user2.authUserId,
        email: 'k.t@gmail.com',
        nameFirst: 'K',
        nameLast: 'T',
        handleStr: 'kt',
        profileImgUrl: expect.any(String),
      }
    ]));
  });

  test.skip('global owner makes self a channel owner', () => {
    const user1 = reqAuthRegister('kevin.tran@hotmail.com', '123456', 'Kevin', 'Tran');
    const user2 = reqAuthRegister('k.t@gmail.com', '123456', 'K', 'T');
    const channel = reqChannelsCreate(user2.token, 'COMP1511', true);
    reqChannelJoin(user1.token, channel.channelId);
    expect(reqChannelAddOwner(user1.token, channel.channelId, user1.authUserId)).toStrictEqual({});
    const result = reqChannelDetails(user2.token, channel.channelId);
    expect(result.name).toStrictEqual('COMP1511');
    expect(result.isPublic).toStrictEqual(true);
    expect(new Set(result.ownerMembers)).toStrictEqual(new Set([
      {
        uId: user2.authUserId,
        email: 'k.t@gmail.com',
        nameFirst: 'K',
        nameLast: 'T',
        handleStr: 'kt',
        profileImgUrl: expect.any(String),
      },
      {
        uId: user1.authUserId,
        email: 'kevin.tran@hotmail.com',
        nameFirst: 'Kevin',
        nameLast: 'Tran',
        handleStr: 'kevintran',
        profileImgUrl: expect.any(String),
      }
    ]));
    expect(new Set(result.allMembers)).toStrictEqual(new Set([
      {
        uId: user2.authUserId,
        email: 'k.t@gmail.com',
        nameFirst: 'K',
        nameLast: 'T',
        handleStr: 'kt',
        profileImgUrl: expect.any(String),
      },
      {
        uId: user1.authUserId,
        email: 'kevin.tran@hotmail.com',
        nameFirst: 'Kevin',
        nameLast: 'Tran',
        handleStr: 'kevintran',
        profileImgUrl: expect.any(String),
      }
    ]));
  });
});

describe('/channel/removeowner', () => {
  let user1: { token: string, authUserId: number };
  let user2: { token: string, authUserId: number };
  beforeEach(() => {
    user1 = reqAuthRegister('kevin.tran@hotmail.com', '123456', 'Kevin', 'Tran');
    user2 = reqAuthRegister('k.t@gmail.com', '123456', 'K', 'T');
  });

  test('invalid token', () => {
    const channel = reqChannelsCreate(user1.token, 'COMP1511', true);
    reqChannelJoin(user2.token, channel.channelId);
    reqChannelAddOwner(user1.token, channel.channelId, user2.authUserId);
    let invalidToken = user1.token;
    while (invalidToken === user1.token || invalidToken === user2.token) {
      invalidToken += 1;
    }
    expect(reqChannelRemoveOwner(invalidToken, channel.channelId, user2.authUserId)).toEqual(FORBIDDEN);
  });

  test('invalid channelId', () => {
    const channel = reqChannelsCreate(user1.token, 'COMP1511', true);
    reqChannelJoin(user2.token, channel.channelId);
    reqChannelAddOwner(user1.token, channel.channelId, user2.authUserId);
    expect(reqChannelRemoveOwner(user1.token, channel.channelId + 1, user2.authUserId)).toEqual(BAD_REQUEST);
  });

  test('invalid uId', () => {
    const channel = reqChannelsCreate(user1.token, 'COMP1511', true);
    reqChannelJoin(user2.token, channel.channelId);
    reqChannelAddOwner(user1.token, channel.channelId, user2.authUserId);
    let invalidId = user2.authUserId;
    while (invalidId === user1.authUserId || invalidId === user2.authUserId) {
      invalidId += 1;
    }
    expect(reqChannelRemoveOwner(user1.token, channel.channelId, invalidId)).toEqual(BAD_REQUEST);
  });

  test('uId refers to user who is not an owner of the channel', () => {
    const channel = reqChannelsCreate(user1.token, 'COMP1511', true);
    reqChannelJoin(user2.token, channel.channelId);
    expect(reqChannelRemoveOwner(user1.token, channel.channelId, user2.authUserId)).toEqual(BAD_REQUEST);
  });

  test('uId refers to user who is not a member of the channel', () => {
    const channel = reqChannelsCreate(user1.token, 'COMP1511', true);
    expect(reqChannelRemoveOwner(user1.token, channel.channelId, user2.authUserId)).toEqual(BAD_REQUEST);
  });

  test('uId refers to user who is currently the only owner of the channel', () => {
    const channel = reqChannelsCreate(user2.token, 'COMP1511', true);
    reqChannelJoin(user1.token, channel.channelId);
    expect(reqChannelRemoveOwner(user1.token, channel.channelId, user2.authUserId)).toEqual(BAD_REQUEST);
    expect(reqChannelRemoveOwner(user2.token, channel.channelId, user2.authUserId)).toEqual(BAD_REQUEST);
  });

  test('authorised user does not have owner permissions in the channel', () => {
    const channel = reqChannelsCreate(user1.token, 'COMP1511', true);
    reqChannelJoin(user2.token, channel.channelId);
    expect(reqChannelRemoveOwner(user2.token, channel.channelId, user1.authUserId)).toEqual(FORBIDDEN);
  });

  test('successfully removed somebody as an owner', () => {
    const channel = reqChannelsCreate(user1.token, 'COMP1511', true);
    reqChannelJoin(user2.token, channel.channelId);
    reqChannelAddOwner(user1.token, channel.channelId, user2.authUserId);
    expect(reqChannelRemoveOwner(user2.token, channel.channelId, user1.authUserId)).toStrictEqual({});
    const result = reqChannelDetails(user2.token, channel.channelId);
    expect(result.name).toStrictEqual('COMP1511');
    expect(result.isPublic).toStrictEqual(true);
    expect(new Set(result.ownerMembers)).toStrictEqual(new Set([
      {
        uId: user2.authUserId,
        email: 'k.t@gmail.com',
        nameFirst: 'K',
        nameLast: 'T',
        handleStr: 'kt',
        profileImgUrl: expect.any(String),
      }
    ]));
    expect(new Set(result.allMembers)).toStrictEqual(new Set([
      {
        uId: user1.authUserId,
        email: 'kevin.tran@hotmail.com',
        nameFirst: 'Kevin',
        nameLast: 'Tran',
        handleStr: 'kevintran',
        profileImgUrl: expect.any(String),
      },
      {
        uId: user2.authUserId,
        email: 'k.t@gmail.com',
        nameFirst: 'K',
        nameLast: 'T',
        handleStr: 'kt',
        profileImgUrl: expect.any(String),
      }
    ]));
  });

  test.skip('global owner removes somebody as an owner', () => {
    const user3 = reqAuthRegister('ke.tr@outlook.com', '123456', 'Ke', 'Tr');
    const channel = reqChannelsCreate(user2.token, 'COMP1511', true);
    reqChannelJoin(user1.token, channel.channelId);
    reqChannelJoin(user3.token, channel.channelId);
    reqChannelAddOwner(user1.token, channel.channelId, user3.authUserId);
    expect(reqChannelRemoveOwner(user1.token, channel.channelId, user2.authUserId)).toStrictEqual({});
    const result = reqChannelDetails(user2.token, channel.channelId);
    expect(result.name).toStrictEqual('COMP1511');
    expect(result.isPublic).toStrictEqual(true);
    expect(new Set(result.ownerMembers)).toStrictEqual(new Set([
      {
        uId: user3.authUserId,
        email: 'ke.tr@outlook.com',
        nameFirst: 'Ke',
        nameLast: 'Tr',
        handleStr: 'ketr',
        profileImgUrl: expect.any(String),
      }
    ]));
    expect(new Set(result.allMembers)).toStrictEqual(new Set([
      {
        uId: user1.authUserId,
        email: 'kevin.tran@hotmail.com',
        nameFirst: 'Kevin',
        nameLast: 'Tran',
        handleStr: 'kevintran',
        profileImgUrl: expect.any(String),
      },
      {
        uId: user2.authUserId,
        email: 'k.t@gmail.com',
        nameFirst: 'K',
        nameLast: 'T',
        handleStr: 'kt',
        profileImgUrl: expect.any(String),
      },
      {
        uId: user3.authUserId,
        email: 'ke.tr@outlook.com',
        nameFirst: 'Ke',
        nameLast: 'Tr',
        handleStr: 'ketr',
        profileImgUrl: expect.any(String),
      }
    ]));
  });
});
