import {
  BAD_REQUEST,
  FORBIDDEN,
  reqClear,
  reqAuthRegister,
  reqChannelsCreate,
  reqChannelsList,
  reqChannelsListAll,
  reqChannelDetails,
  reqChannelJoin,
} from '../requests';

beforeEach(reqClear);
const sampleUser1 = ['darci.walsh@mail.com', 'blah123', 'Darci', 'Walsh'] as const;
const sampleUser2 = ['cora.walsh@mail.com', 'something9', 'Cora', 'Walsh'] as const;
const publicChannel = ['Mechatronics', true] as const;
const privateChannel = ['Software', false] as const;

type validUser = { token: string, authUserId: number };

describe('/channels/create', () => {
  let validUser: validUser;
  beforeEach(() => {
    validUser = reqAuthRegister(...sampleUser1);
  });

  describe('error', () => {
    test('empty name', () => {
      expect(reqChannelsCreate(validUser.token, '', true)).toEqual(BAD_REQUEST);
    });

    test('name with greater than 20 characters', () => {
      expect(reqChannelsCreate(validUser.token, 'mechatronicsengineering', true)).toEqual(BAD_REQUEST);
    });

    test('invalid token', () => {
      expect(reqChannelsCreate(validUser.token + '1', ...publicChannel)).toEqual(FORBIDDEN);
    });
  });

  describe('valid creation', () => {
    test('creates a public channel', () => {
      const chanId = reqChannelsCreate(validUser.token, ...publicChannel);
      expect(chanId).toStrictEqual(
        {
          channelId: expect.any(Number)
        }
      );
      expect(reqChannelDetails(validUser.token, chanId.channelId).isPublic).toEqual(true);
    });

    test('creates a private channel', () => {
      const chanId = reqChannelsCreate(validUser.token, ...privateChannel);
      expect(chanId).toStrictEqual(
        {
          channelId: expect.any(Number)
        }
      );
      expect(reqChannelDetails(validUser.token, chanId.channelId).isPublic).toEqual(false);
    });

    test('creates multiple channels', () => {
      expect(reqChannelsCreate(validUser.token, ...privateChannel)).toStrictEqual(
        {
          channelId: expect.any(Number)
        }
      );

      expect(reqChannelsCreate(validUser.token, ...publicChannel)).toStrictEqual(
        {
          channelId: expect.any(Number)
        }
      );
    });

    test('adds only first member as owner', () => {
      const otherValidUser = reqAuthRegister(...sampleUser2);
      const channel = reqChannelsCreate(validUser.token, ...publicChannel);
      reqChannelJoin(otherValidUser.token, channel.channelId);
      expect(reqChannelDetails(validUser.token, channel.channelId).ownerMembers).toStrictEqual([{
        uId: validUser.authUserId,
        email: sampleUser1[0],
        nameFirst: sampleUser1[2],
        nameLast: sampleUser1[3],
        handleStr: 'darciwalsh',
        profileImgUrl: expect.any(String),
      }]);
    });
  });
});

describe('/channels/list', () => {
  test('invalid token', () => {
    expect(reqChannelsList('1')).toEqual(FORBIDDEN);
  });

  describe('valid outputs', () => {
    test('no channels', () => {
      const validUser = reqAuthRegister(...sampleUser1);
      expect(reqChannelsList(validUser.token)).toStrictEqual({ channels: [] });
    });

    test('one channel', () => {
      const validUser = reqAuthRegister(...sampleUser1);
      const channelId = reqChannelsCreate(validUser.token, ...publicChannel).channelId;
      expect(reqChannelsList(validUser.token)).toStrictEqual(
        {
          channels: [{ channelId: channelId, name: publicChannel[0] }]
        }
      );
    });

    test('multiple channels, same member user', () => {
      const validUser = reqAuthRegister(...sampleUser1);
      const publicChannelId = reqChannelsCreate(validUser.token, ...publicChannel).channelId;
      const privateChannelId = reqChannelsCreate(validUser.token, ...privateChannel).channelId;

      const arr = reqChannelsList(validUser.token).channels;
      expect(new Set(arr)).toStrictEqual(new Set([
        { channelId: publicChannelId, name: publicChannel[0] },
        { channelId: privateChannelId, name: privateChannel[0] },
      ]));
    });

    test('multiple channels, different users', () => {
      const validUser1 = reqAuthRegister(...sampleUser1);
      const publicChannelId = reqChannelsCreate(validUser1.token, ...publicChannel).channelId;
      const validUser2 = reqAuthRegister(...sampleUser2);
      const privateChannelId = reqChannelsCreate(validUser2.token, ...privateChannel).channelId;

      expect(reqChannelsList(validUser1.token)).toStrictEqual(
        {
          channels: [{ channelId: publicChannelId, name: publicChannel[0] }]
        }
      );

      expect(reqChannelsList(validUser2.token)).toStrictEqual(
        {
          channels: [{ channelId: privateChannelId, name: privateChannel[0] }]
        }
      );
    });
  });
});

describe('/channels/listAll', () => {
  test('invalid token', () => {
    expect(reqChannelsListAll('1')).toEqual(FORBIDDEN);
  });

  test('no channels', () => {
    const validUser = reqAuthRegister(...sampleUser1);
    expect(reqChannelsListAll(validUser.token)).toStrictEqual({ channels: [] });
  });

  test('one channel', () => {
    const validUser = reqAuthRegister(...sampleUser1);
    const channelId = reqChannelsCreate(validUser.token, ...publicChannel).channelId;
    expect(reqChannelsListAll(validUser.token)).toStrictEqual(
      {
        channels: [{ channelId: channelId, name: publicChannel[0] }]
      }
    );
  });

  test('multiple channels, same member user', () => {
    const validUser = reqAuthRegister(...sampleUser1);
    const publicChannelId = reqChannelsCreate(validUser.token, ...publicChannel).channelId;
    const privateChannelId = reqChannelsCreate(validUser.token, ...privateChannel).channelId;

    const arr = reqChannelsListAll(validUser.token).channels;
    expect(new Set(arr)).toStrictEqual(new Set([
      { channelId: publicChannelId, name: publicChannel[0] },
      { channelId: privateChannelId, name: privateChannel[0] },
    ]));
  });

  test('multiple channels, different users', () => {
    const validUser1 = reqAuthRegister(...sampleUser1);
    const publicChannelId = reqChannelsCreate(validUser1.token, ...publicChannel).channelId;
    const validUser2 = reqAuthRegister(...sampleUser2);
    const privateChannelId = reqChannelsCreate(validUser2.token, ...privateChannel).channelId;

    const arr = reqChannelsListAll(validUser2.token).channels;
    expect(new Set(arr)).toStrictEqual(new Set([
      { channelId: publicChannelId, name: publicChannel[0] },
      { channelId: privateChannelId, name: privateChannel[0] },
    ]));
  });
});
