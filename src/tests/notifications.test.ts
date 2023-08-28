import {
  FORBIDDEN,
  reqClear,
  reqAuthRegister,
  reqChannelsCreate,
  reqChannelJoin,
  reqChannelInvite,
  reqChannelLeave,
  reqDMCreate,
  reqMessageSend,
  reqMessageEdit,
  reqMessageShare,
  reqMessageReact,
  reqMessageUnreact,
  reqGetNotifications,
} from '../requests';

beforeEach(reqClear);
const sampleUser1 = ['darci.walsh@mail.com', 'blah123', 'Darci', 'Walsh'] as const;
const sampleUser2 = ['cora.walsh@mail.com', 'something9', 'Cora', 'Walsh'] as const;
const sampleUser3 = ['brian.nhan@mail.com', 'something10', 'Brian', 'Nhan'] as const;
const publicChannel = ['Mechatronics', true] as const;
const privateChannel = ['Software', false] as const;
type ValidUser = { token: string, authUserId: number };

describe('/notifications/get/v1', () => {
  let validUser: ValidUser;
  let validUser2: ValidUser;
  let publicChannelId: number;
  let message1: number;
  beforeEach(() => {
    validUser = reqAuthRegister(...sampleUser1);
    validUser2 = reqAuthRegister(...sampleUser2);
    publicChannelId = reqChannelsCreate(validUser.token, ...publicChannel).channelId;
    reqChannelJoin(validUser2.token, publicChannelId);
    message1 = reqMessageSend(validUser.token, publicChannelId, 'vAlid message').messageId;
  });

  test('invalid token', () => {
    expect(reqGetNotifications('invalid token')).toEqual(FORBIDDEN);
  });

  test('reacting to message', () => {
    reqMessageReact(validUser2.token, message1, 1);
    expect(reqGetNotifications(validUser.token)).toStrictEqual({
      notifications: [
        {
          channelId: publicChannelId,
          dmId: -1,
          notificationMessage: 'corawalsh reacted to your message in Mechatronics',
        }
      ]
    });
  });

  test('person reacting to message in channel that sender is no longer in', () => {
    reqChannelLeave(validUser.token, publicChannelId);
    reqMessageReact(validUser2.token, message1, 1);
    expect(reqGetNotifications(validUser.token)).toStrictEqual({ notifications: [] });
  });

  test('unreacting to message', () => {
    reqMessageReact(validUser2.token, message1, 1);
    reqMessageUnreact(validUser2.token, message1, 1);
    expect(reqGetNotifications(validUser.token)).toStrictEqual({
      notifications: [
        {
          channelId: publicChannelId,
          dmId: -1,
          notificationMessage: 'corawalsh reacted to your message in Mechatronics',
        }
      ]
    });
  });

  test('tagging person in message', () => {
    reqMessageSend(validUser2.token, publicChannelId, '@darciwalsh hello');
    expect(reqGetNotifications(validUser.token)).toStrictEqual({
      notifications: [
        {
          channelId: publicChannelId,
          dmId: -1,
          notificationMessage: 'corawalsh tagged you in Mechatronics: @darciwalsh hello',
        }
      ]
    });
    reqMessageSend(validUser.token, publicChannelId, '@darciwalsh sup');
    expect(reqGetNotifications(validUser.token)).toStrictEqual({
      notifications: [
        {
          channelId: publicChannelId,
          dmId: -1,
          notificationMessage: 'darciwalsh tagged you in Mechatronics: @darciwalsh sup',
        },
        {
          channelId: publicChannelId,
          dmId: -1,
          notificationMessage: 'corawalsh tagged you in Mechatronics: @darciwalsh hello',
        }
      ]
    });
  });

  test('tagging invalid handlestring', () => {
    reqMessageSend(validUser2.token, publicChannelId, '@darciwaslh hello');
    expect(reqGetNotifications(validUser.token)).toStrictEqual({ notifications: [] });
  });

  test('tagging multiple people in a single message', () => {
    const validUser3 = reqAuthRegister(...sampleUser3);
    reqChannelJoin(validUser3.token, publicChannelId);
    reqMessageSend(validUser2.token, publicChannelId, '@darciwalsh @corawalsh @briannhan hello');
    expect(reqGetNotifications(validUser.token)).toStrictEqual({
      notifications: [
        {
          channelId: publicChannelId,
          dmId: -1,
          notificationMessage: 'corawalsh tagged you in Mechatronics: @darciwalsh @corawal',
        }
      ]
    });
    expect(reqGetNotifications(validUser2.token)).toStrictEqual({
      notifications: [
        {
          channelId: publicChannelId,
          dmId: -1,
          notificationMessage: 'corawalsh tagged you in Mechatronics: @darciwalsh @corawal',
        }
      ]
    });
    expect(reqGetNotifications(validUser3.token)).toStrictEqual({
      notifications: [
        {
          channelId: publicChannelId,
          dmId: -1,
          notificationMessage: 'corawalsh tagged you in Mechatronics: @darciwalsh @corawal',
        }
      ]
    });
  });

  test('same tag appears multiple times in a message', () => {
    reqMessageSend(validUser2.token, publicChannelId, '@darciwalsh @darciwalsh @darciwalsh hello');
    expect(reqGetNotifications(validUser.token)).toStrictEqual({
      notifications: [
        {
          channelId: publicChannelId,
          dmId: -1,
          notificationMessage: 'corawalsh tagged you in Mechatronics: @darciwalsh @darciwa',
        }
      ]
    });
  });

  test('message edited to contain a tag', () => {
    const message2 = reqMessageSend(validUser2.token, publicChannelId, 'hello').messageId;
    expect(reqGetNotifications(validUser.token)).toStrictEqual({ notifications: [] });
    reqMessageEdit(validUser2.token, message2, '@darciwalsh hello');
    expect(reqGetNotifications(validUser.token)).toStrictEqual({
      notifications: [
        {
          channelId: publicChannelId,
          dmId: -1,
          notificationMessage: 'corawalsh tagged you in Mechatronics: @darciwalsh hello',
        }
      ]
    });
  });

  test('message share optional message contains tag', () => {
    const message2 = reqMessageSend(validUser.token, publicChannelId, '@corawalsh hello').messageId;
    const privChannelId = reqChannelsCreate(validUser2.token, ...privateChannel).channelId;
    reqChannelJoin(validUser.token, privChannelId);
    reqMessageShare(validUser2.token, message2, privChannelId, -1, '@darciwalsh nice message');
    expect(reqGetNotifications(validUser.token)).toStrictEqual({
      notifications: [
        {
          channelId: privChannelId,
          dmId: -1,
          notificationMessage: 'corawalsh tagged you in Software: @darciwalsh nice mes',
        },
      ]
    });

    // check that tag from original message does not resend notification after message is shared
    expect(reqGetNotifications(validUser2.token).notifications).toContainEqual({
      channelId: publicChannelId,
      dmId: -1,
      notificationMessage: 'darciwalsh tagged you in Mechatronics: @corawalsh hello',
    });
    expect(reqGetNotifications(validUser2.token).notifications).not.toContainEqual({
      channelId: privChannelId,
      dmId: -1,
      notificationMessage: 'corawalsh tagged you in Software: @darciwalsh nice mes',
    });
  });

  test('adding person to a channel/DM', () => {
    const validUser3 = reqAuthRegister(...sampleUser3);
    reqChannelInvite(validUser.token, publicChannelId, validUser3.authUserId);
    expect(reqGetNotifications(validUser3.token)).toStrictEqual({
      notifications: [
        {
          channelId: publicChannelId,
          dmId: -1,
          notificationMessage: 'darciwalsh added you to Mechatronics',
        }
      ]
    });
    const dmId = reqDMCreate(validUser.token, [validUser3.authUserId]).dmId;
    expect(reqGetNotifications(validUser3.token)).toStrictEqual({
      notifications: [
        {
          channelId: -1,
          dmId: dmId,
          notificationMessage: 'darciwalsh added you to briannhan, darciwalsh',
        },
        {
          channelId: publicChannelId,
          dmId: -1,
          notificationMessage: 'darciwalsh added you to Mechatronics',
        }
      ]
    });
  });

  test('most recent 20 notifications returned', () => {
    let messages = [
      'hello', 'respond', 'ay', 'u there?', 'stop ignoring me', 'pls stop', 'i know u see this', ':(', ':(((', ':((((((',
      'u make me sad', 'very sad', 'extremely sad', 'that u dont like me', 'that u hate me', 'that u despise me',
      'i know i can be annoying', 'but thats just who i am', 'u gotta deal with it', 'deal with your cruelty',
    ];
    expect(messages.length).toEqual(20);
    messages = messages.map(m => '@darciwalsh ' + m);
    for (const m of messages) {
      reqMessageSend(validUser2.token, publicChannelId, m);
    }
    const validUser3 = reqAuthRegister(...sampleUser3);
    const privChannelId = reqChannelsCreate(validUser3.token, ...privateChannel).channelId;
    reqChannelInvite(validUser3.token, privChannelId, validUser.authUserId);

    const expected = messages.map(m => ({
      channelId: publicChannelId,
      dmId: -1,
      notificationMessage: 'corawalsh tagged you in Mechatronics: ' + m.slice(0, 20),
    }));
    expected.shift();
    expected.push({
      channelId: privChannelId,
      dmId: -1,
      notificationMessage: 'briannhan added you to Software',
    });
    expect(reqGetNotifications(validUser.token)).toStrictEqual({ notifications: expected.reverse() });
  });
});
