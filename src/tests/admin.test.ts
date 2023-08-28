import {
  BAD_REQUEST,
  FORBIDDEN,
  reqAuthLogin,
  reqAuthRegister,
  reqChannelDetails,
  reqChannelJoin,
  reqChannelsCreate,
  reqChannelsList,
  reqClear,
  reqDMCreate,
  reqDMList,
  reqDMMessages,
  reqGetDMDetails,
  reqMessageSendDM,
  reqUserProfile,
  reqUserRemove,
  reqUsersAll,
  reqUserSetEmail,
  reqUserSetHandle,
  reqSetUserPermission,
} from '../requests';

beforeEach(reqClear);

const GLOBAL_OWNER = 1;
const GLOBAL_MEMBER = 2;

describe('/admin/user/remove/v1', () => {
  let globalOwner: { authUserId: number, token: string };
  let removedUser: { authUserId: number, token: string };
  let ownerProfile: {
    uId: number,
    email: string,
    nameFirst: string,
    nameLast: string,
    handleStr: string,
    profileImgUrl: string,
  };
  beforeEach(() => {
    globalOwner = reqAuthRegister('email@gmail.com', 'password', 'ahmed', 'ibrahim');
    removedUser = reqAuthRegister('email@hotmail.com', 'password', 'first', 'last');
    ownerProfile = {
      uId: globalOwner.authUserId,
      email: 'email@gmail.com',
      nameFirst: 'ahmed',
      nameLast: 'ibrahim',
      handleStr: 'ahmedibrahim',
      profileImgUrl: expect.any(String),
    };
  });

  test('error: invalid token', () => {
    let invalidToken = globalOwner.token + '1';
    if (invalidToken === removedUser.token) invalidToken += '1';
    expect(reqUserRemove(invalidToken, removedUser.authUserId)).toEqual(FORBIDDEN);
  });

  test('error: non-global owner', () => {
    const dummy = reqAuthRegister('email@yahoo.com', 'password', 'dummy', 'user');
    expect(reqUserRemove(removedUser.token, dummy.authUserId)).toEqual(FORBIDDEN);
  });

  test('error: global owner tries to remove himself', () => {
    expect(reqUserRemove(globalOwner.token, globalOwner.authUserId)).toEqual(BAD_REQUEST);
  });

  test('error: removing a user twice', () => {
    expect(reqUserRemove(globalOwner.token, removedUser.authUserId)).toStrictEqual({});
    expect(reqUserRemove(globalOwner.token, removedUser.authUserId)).toEqual(BAD_REQUEST);
  });

  test('profile of removed user can still be accessed', () => {
    reqUserRemove(globalOwner.token, removedUser.authUserId);
    expect(reqUserProfile(globalOwner.token, removedUser.authUserId).user).toStrictEqual({
      uId: removedUser.authUserId,
      email: 'email@hotmail.com',
      nameFirst: 'Removed',
      nameLast: 'user',
      handleStr: 'firstlast',
      profileImgUrl: expect.any(String),
    });
  });

  test('all users list does not include removed user', () => {
    reqUserRemove(globalOwner.token, removedUser.authUserId);
    expect(reqUsersAll(globalOwner.token).users).toStrictEqual([ownerProfile]);
  });

  test('removed user no longer exists in channels/dms they were in', () => {
    const channelId = reqChannelsCreate(removedUser.token, 'channel', true).channelId;
    reqChannelJoin(globalOwner.token, channelId);
    const dmId = reqDMCreate(removedUser.token, [globalOwner.authUserId]).dmId;

    reqUserRemove(globalOwner.token, removedUser.authUserId);
    expect(reqChannelsList(removedUser.token)).toEqual(FORBIDDEN);
    expect(reqDMList(removedUser.token)).toEqual(FORBIDDEN);

    expect(reqChannelDetails(globalOwner.token, channelId)).toStrictEqual({
      name: 'channel',
      isPublic: true,
      ownerMembers: [],
      allMembers: [ownerProfile],
    });
    expect(reqGetDMDetails(globalOwner.token, dmId)).toStrictEqual({
      name: 'ahmedibrahim, firstlast',
      members: [ownerProfile],
    });
  });

  test('messages sent by removed user are replaced with "Removed user"', () => {
    const dmId = reqDMCreate(globalOwner.token, [removedUser.authUserId]).dmId;
    reqMessageSendDM(removedUser.token, dmId, 'hello');
    reqMessageSendDM(removedUser.token, dmId, 'pls dont remove me');
    reqMessageSendDM(globalOwner.token, dmId, 'lol get removed');
    reqUserRemove(globalOwner.token, removedUser.authUserId);

    const messages = reqDMMessages(globalOwner.token, dmId, 0).messages;
    expect(messages.map((m: any) => m.message)).toStrictEqual(
      ['lol get removed', 'Removed user', 'Removed user']
    );
  });

  test('removed user tries to log in', () => {
    reqUserRemove(globalOwner.token, removedUser.authUserId);
    expect(reqAuthLogin('email@hotmail.com', 'password')).toEqual(BAD_REQUEST);
  });

  test('existing user can modify their email to the email of the removed user', () => {
    const user = reqAuthRegister('email@yahoo.com', 'password', 'some', 'user');
    expect(reqUserSetEmail(user.token, 'email@hotmail.com')).toEqual(BAD_REQUEST);

    reqUserRemove(globalOwner.token, removedUser.authUserId);
    reqUserSetEmail(user.token, 'email@hotmail.com');
    expect(reqUserProfile(user.token, user.authUserId).user.email).toEqual('email@hotmail.com');
  });

  test('new user registers using the email of the removed user', () => {
    reqUserRemove(globalOwner.token, removedUser.authUserId);
    const user = reqAuthRegister('email@hotmail.com', 'password', 'some', 'user');
    expect(user).toStrictEqual({ token: expect.any(String), authUserId: expect.any(Number) });
  });

  test('existing user can modify their handle to the handle of the removed user', () => {
    const user = reqAuthRegister('email@yahoo.com', 'password', 'some', 'user');
    expect(reqUserSetHandle(user.token, 'firstlast')).toEqual(BAD_REQUEST);

    reqUserRemove(globalOwner.token, removedUser.authUserId);
    reqUserSetHandle(user.token, 'firstlast');
    expect(reqUserProfile(user.token, user.authUserId).user.handleStr).toEqual('firstlast');
  });

  test('new user registers using the handle of the removed user', () => {
    reqUserRemove(globalOwner.token, removedUser.authUserId);
    const user = reqAuthRegister('email@yahoo.com', 'password', 'first', 'last');
    expect(user).toStrictEqual({ token: expect.any(String), authUserId: expect.any(Number) });
    expect(reqUserProfile(user.token, user.authUserId).user.handleStr).toEqual('firstlast');
  });

  test('member of multiple channels gets rmemoved', () => {
    const channelId1 = reqChannelsCreate(globalOwner.token, 'channel', true).channelId;
    const channelId2 = reqChannelsCreate(globalOwner.token, 'channel2', true).channelId;
    const channelId3 = reqChannelsCreate(globalOwner.token, 'channel2', true).channelId;
    reqChannelJoin(removedUser.token, channelId1);
    reqChannelJoin(removedUser.token, channelId2);
    reqChannelJoin(removedUser.token, channelId3);
    reqUserRemove(globalOwner.token, removedUser.authUserId);
    expect(reqUsersAll(globalOwner.token).users).toStrictEqual([ownerProfile]);
  });
});

describe('/admin/userpermission/change/v1', () => {
  let owner: { authUserId: number, token: string };
  let member: { authUserId: number, token: string };
  beforeEach(() => {
    owner = reqAuthRegister('email@gmail.com', 'password', 'ahmed', 'ibrahim');
    member = reqAuthRegister('email@hotmail.com', 'password', 'first', 'last');
  });

  describe('error', () => {
    test('invalid token', () => {
      let invalidToken = owner.token + '1';
      if (invalidToken === member.token) invalidToken += '1';
      expect(reqSetUserPermission(invalidToken, member.authUserId, GLOBAL_OWNER)).toEqual(FORBIDDEN);
    });

    test('invalid user id', () => {
      let invalidId = owner.authUserId + 1;
      if (invalidId === member.authUserId) invalidId += 1;
      expect(reqSetUserPermission(owner.token, invalidId, GLOBAL_OWNER)).toEqual(BAD_REQUEST);
    });

    test('user is the only global owner and is being demoted to a user', () => {
      expect(reqSetUserPermission(owner.token, owner.authUserId, GLOBAL_MEMBER)).toEqual(BAD_REQUEST);
    });

    test('invalid permission id', () => {
      expect(reqSetUserPermission(owner.token, member.authUserId, 3)).toEqual(BAD_REQUEST);
      expect(reqSetUserPermission(owner.token, member.authUserId, -2)).toEqual(BAD_REQUEST);
    });

    test('user already has permission level', () => {
      expect(reqSetUserPermission(owner.token, member.authUserId, GLOBAL_MEMBER)).toEqual(BAD_REQUEST);
    });

    test('authorised user is not a global owner', () => {
      expect(reqSetUserPermission(member.token, member.authUserId, GLOBAL_OWNER)).toEqual(FORBIDDEN);
    });
  });

  describe('valid inputs', () => {
    test('correct return type', () => {
      expect(reqSetUserPermission(owner.token, member.authUserId, GLOBAL_OWNER)).toEqual({});
    });

    test('changes user to an owner', () => {
      reqSetUserPermission(owner.token, member.authUserId, GLOBAL_OWNER);
      expect(reqSetUserPermission(member.token, member.authUserId, GLOBAL_OWNER)).toEqual(BAD_REQUEST);
    });

    test('changes owner to a user', () => {
      reqSetUserPermission(owner.token, member.authUserId, GLOBAL_OWNER);
      expect(reqSetUserPermission(owner.token, member.authUserId, GLOBAL_MEMBER)).toEqual({});
      expect(reqSetUserPermission(owner.token, member.authUserId, GLOBAL_MEMBER)).toEqual(BAD_REQUEST);
    });
  });
});
