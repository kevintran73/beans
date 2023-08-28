import {
  BAD_REQUEST,
  FORBIDDEN,
  reqClear,
  reqAuthLogin,
  reqAuthRegister,
  reqUserProfile,
  reqUserSetName,
  reqUserSetEmail,
  reqUserSetHandle,
  reqUsersAll,
  reqUserSetPhoto,
} from '../requests';

beforeEach(reqClear);

describe('/user/profile', () => {
  test('invalid token and profile ID', () => {
    expect(reqUserProfile('14123', 31274890)).toEqual(FORBIDDEN);
  });

  test('invalid profile ID', () => {
    const user = reqAuthRegister('email@gmail.com', 'password', 'first name', 'last name');
    expect(reqUserProfile(user.token, user.authUserId + 1)).toEqual(BAD_REQUEST);
  });

  test('invalid token', () => {
    const user = reqAuthRegister('email@gmail.com', 'password', 'first name', 'last name');
    expect(reqUserProfile(user.token + 1, user.authUserId)).toEqual(FORBIDDEN);
  });

  test('correct return type', () => {
    const user = reqAuthRegister('email@gmail.com', 'password', 'first name', 'last name');
    expect(reqUserProfile(user.token, user.authUserId)).toStrictEqual({
      user: {
        uId: user.authUserId,
        email: 'email@gmail.com',
        nameFirst: 'first name',
        nameLast: 'last name',
        handleStr: 'firstnamelastname',
        profileImgUrl: expect.any(String),
      }
    });
  });

  test('multiple user profiles', () => {
    const user1 = reqAuthRegister('email@gmail.com', 'password', 'first name', 'last name');
    expect(reqUserProfile(user1.token, user1.authUserId)).toStrictEqual({
      user: {
        uId: user1.authUserId,
        email: 'email@gmail.com',
        nameFirst: 'first name',
        nameLast: 'last name',
        handleStr: 'firstnamelastname',
        profileImgUrl: expect.any(String),
      }
    });

    const user2 = reqAuthRegister('email2@gmail.com', 'password2', 'first name2', 'last name2');
    expect(reqUserProfile(user2.token, user2.authUserId)).toStrictEqual({
      user: {
        uId: user2.authUserId,
        email: 'email2@gmail.com',
        nameFirst: 'first name2',
        nameLast: 'last name2',
        handleStr: 'firstname2lastname2',
        profileImgUrl: expect.any(String),
      }
    });

    const user3 = reqAuthRegister('email3@gmail.com', 'password3', 'first name3', 'last name3');
    expect(reqUserProfile(user3.token, user3.authUserId)).toStrictEqual({
      user: {
        uId: user3.authUserId,
        email: 'email3@gmail.com',
        nameFirst: 'first name3',
        nameLast: 'last name3',
        handleStr: 'firstname3lastname3',
        profileImgUrl: expect.any(String),
      }
    });
  });
});

describe('/user/profile/setname', () => {
  let user: { token: string, authUserId: number };
  beforeEach(() => {
    user = reqAuthRegister('email@gmail.com', 'password', 'Ahmed', 'Ibrahim');
  });

  test('token is invalid', () => {
    expect(reqUserSetName(user.token + '1', 'newfirstname', 'newlastname')).toEqual(FORBIDDEN);
  });

  test('error: first name length not between 1 and 50 characters', () => {
    expect(reqUserSetName(user.token, '', 'newlastname')).toEqual(BAD_REQUEST);
    expect(reqUserSetName(user.token, 'a'.repeat(51), 'newlastname')).toEqual(BAD_REQUEST);
  });

  test('error: last name length not between 1 and 50 characters', () => {
    expect(reqUserSetName(user.token, 'newfirstname', '')).toEqual(BAD_REQUEST);
    expect(reqUserSetName(user.token, 'newfirstname', 'a'.repeat(51))).toEqual(BAD_REQUEST);
  });

  test('successful change of names', () => {
    reqUserSetName(user.token, 'newfirstname', 'newlastname');
    expect(reqUserProfile(user.token, user.authUserId).user.nameFirst).toStrictEqual('newfirstname');
    expect(reqUserProfile(user.token, user.authUserId).user.nameLast).toStrictEqual('newlastname');
  });
});

describe('/user/profile/setemail', () => {
  let user: { token: string, authUserId: number };
  let validEmail: string;
  beforeEach(() => {
    user = reqAuthRegister('email@gmail.com', 'password', 'Darci', 'Walsh');
    validEmail = 'validemail@gmail.com';
  });

  describe('error', () => {
    test('email is not valid', () => {
      expect(reqUserSetEmail(user.token, 'darci@@mail')).toEqual(BAD_REQUEST);
    });

    test('email is already in use', () => {
      reqAuthRegister('email2@gmail.com', 'password', 'Cora', 'Walsh');
      expect(reqUserSetEmail(user.token, 'email2@gmail.com')).toEqual(BAD_REQUEST);
    });

    test('token is invalid', () => {
      expect(reqUserSetEmail(user.token + '1', validEmail)).toEqual(FORBIDDEN);
    });
  });

  test('correct return of empty object', () => {
    expect(reqUserSetEmail(user.token, validEmail)).toStrictEqual({});
  });

  test('email is changed successfully', () => {
    reqUserSetEmail(user.token, validEmail);
    expect(reqAuthLogin('email@gmail.com', 'password')).toEqual(BAD_REQUEST);
    expect(reqAuthLogin(validEmail, 'password').authUserId).toStrictEqual(user.authUserId);
    expect(reqUserProfile(user.token, user.authUserId).user.email).toStrictEqual(validEmail);
  });
});

describe('/user/profile/sethandle', () => {
  let user: {token: string, authUserId: number};
  beforeEach(() => {
    user = reqAuthRegister('email@gmail.com', 'password', 'Ahmed', 'Ibrahim');
  });

  test('error: invalid token', () => {
    expect(reqUserSetHandle(user.token + '1', 'newhandle')).toEqual(FORBIDDEN);
  });

  test('error: handle length not between 3 and 20 characters', () => {
    expect(reqUserSetHandle(user.token, 'a')).toEqual(BAD_REQUEST);
    expect(reqUserSetHandle(user.token, 'a'.repeat(21))).toEqual(BAD_REQUEST);
  });

  test('error: handle contains non-alphanumeric characters', () => {
    expect(reqUserSetHandle(user.token, 'h@ndle')).toEqual(BAD_REQUEST);
  });

  test('error: handle is already in use', () => {
    reqAuthRegister('email2@gmail.com', 'password', 'first', 'last');
    expect(reqUserSetHandle(user.token, 'firstlast')).toEqual(BAD_REQUEST);
  });

  test('correct return of empty object', () => {
    expect(reqUserSetHandle(user.token, 'newhandle')).toStrictEqual({});
  });

  test('successful change of user handle', () => {
    reqUserSetHandle(user.token, 'newhandle');
    expect(reqUserProfile(user.token, user.authUserId).user.handleStr).toStrictEqual('newhandle');
  });
});

describe('/user/all', () => {
  let user: { token: string, authUserId: number };
  beforeEach(() => {
    user = reqAuthRegister('email@gmail.com', 'password', 'Ahmed', 'Ibrahim');
  });

  test('error: invalid token', () => {
    expect(reqUsersAll(user.token + '1')).toEqual(FORBIDDEN);
  });

  test('one user', () => {
    expect(reqUsersAll(user.token)).toStrictEqual({
      users: [{
        uId: user.authUserId,
        email: 'email@gmail.com',
        nameFirst: 'Ahmed',
        nameLast: 'Ibrahim',
        handleStr: 'ahmedibrahim',
        profileImgUrl: expect.any(String),
      }]
    });
  });

  test('multiple users', () => {
    const user2 = reqAuthRegister('ND@gmail.com', 'password2', 'Nathan', 'Dinh');
    const user3 = reqAuthRegister('KT@gmail.com', 'password3', 'Kevin', 'Tran');

    const arr = reqUsersAll(user.token).users;
    expect(new Set(arr)).toStrictEqual(new Set([
      {
        uId: user.authUserId,
        email: 'email@gmail.com',
        nameFirst: 'Ahmed',
        nameLast: 'Ibrahim',
        handleStr: 'ahmedibrahim',
        profileImgUrl: expect.any(String),
      },
      {
        uId: user2.authUserId,
        email: 'nd@gmail.com',
        nameFirst: 'Nathan',
        nameLast: 'Dinh',
        handleStr: 'nathandinh',
        profileImgUrl: expect.any(String),
      },
      {
        uId: user3.authUserId,
        email: 'kt@gmail.com',
        nameFirst: 'Kevin',
        nameLast: 'Tran',
        handleStr: 'kevintran',
        profileImgUrl: expect.any(String),
      }
    ]));
  });
});

describe('/user/profile/uploadphoto/v1', () => {
  let jpgUrl: string;
  let pngUrl: string;
  let user: { token: string, authUserId: number };
  beforeEach(() => {
    jpgUrl = 'http://images.squarespace-cdn.com/content/v1/57a94d2cb3db2b0e6c4573d4/1512351370636-Y5715ANM82IIB388RKTN/CLI_5131.jpg?format=500w';
    pngUrl = 'http://icons.iconarchive.com/icons/iconsmind/outline/128/Gorilla-icon.png';
    user = reqAuthRegister('email@gmail.com', 'password', 'Ahmed', 'Ibrahim');
  });

  test('invalid token', () => {
    expect(reqUserSetPhoto('invalid token', jpgUrl, 0, 0, 100, 100)).toEqual(FORBIDDEN);
  });

  test.each(['http://invalidURL.com/image/you', 'http://images.squarespace-cdn.com/content/v1/aadfa', 'http://a.com'])('invalid URL', (invalidUrl) => {
    expect(reqUserSetPhoto(user.token, invalidUrl, 0, 0, 100, 100)).toEqual(BAD_REQUEST);
    expect(reqUserSetPhoto(user.token, invalidUrl, 0, 0, 100, 100)).toEqual(BAD_REQUEST);
    expect(reqUserSetPhoto(user.token, invalidUrl, 0, 0, 100, 100)).toEqual(BAD_REQUEST);
  });

  test('any of xStart, yStart, xEnd or yEnd not within dimensions of image at URL', () => {
    expect(reqUserSetPhoto(user.token, jpgUrl, -1, 0, 100, 100)).toEqual(BAD_REQUEST);
    expect(reqUserSetPhoto(user.token, jpgUrl, 0, -1, 100, 100)).toEqual(BAD_REQUEST);
    expect(reqUserSetPhoto(user.token, jpgUrl, -2, 0, -1, 100)).toEqual(BAD_REQUEST);
    expect(reqUserSetPhoto(user.token, jpgUrl, 0, -2, 100, -1)).toEqual(BAD_REQUEST);
    expect(reqUserSetPhoto(user.token, jpgUrl, 1000, 0, 10000, 100)).toEqual(BAD_REQUEST);
    expect(reqUserSetPhoto(user.token, jpgUrl, 0, 1000, 100, 10000)).toEqual(BAD_REQUEST);
    expect(reqUserSetPhoto(user.token, jpgUrl, 0, 0, 1000, 100)).toEqual(BAD_REQUEST);
    expect(reqUserSetPhoto(user.token, jpgUrl, 0, 0, 100, 1000)).toEqual(BAD_REQUEST);
    expect(reqUserSetPhoto(user.token, jpgUrl, 500, 0, 100, 100)).toEqual(BAD_REQUEST);
    expect(reqUserSetPhoto(user.token, jpgUrl, 0, 749, 100, 100)).toEqual(BAD_REQUEST);
  });

  test('xEnd is less than or equal to xStart or yEnd is less than or equal to yStart', () => {
    expect(reqUserSetPhoto(user.token, jpgUrl, 100, 0, 1, 100)).toEqual(BAD_REQUEST);
    expect(reqUserSetPhoto(user.token, jpgUrl, 0, 100, 100, 1)).toEqual(BAD_REQUEST);
    expect(reqUserSetPhoto(user.token, jpgUrl, 1, 0, 1, 100)).toEqual(BAD_REQUEST);
    expect(reqUserSetPhoto(user.token, jpgUrl, 0, 1, 100, 1)).toEqual(BAD_REQUEST);
  });

  test('image uploaded is not a JPG', () => {
    expect(reqUserSetPhoto(user.token, pngUrl, 0, 0, 100, 100)).toEqual(BAD_REQUEST);
    expect(reqUserSetPhoto(user.token, pngUrl, 0, 0, 128, 128)).toEqual(BAD_REQUEST);
  });

  test('successfully crops photo and stores it', () => {
    expect(reqUserSetPhoto(user.token, jpgUrl, 0, 0, 100, 100)).toEqual({});
    expect(reqUserSetPhoto(user.token, jpgUrl, 0, 0, 200, 200)).toEqual({});
    expect(reqUserSetPhoto(user.token, jpgUrl, 0, 0, 500, 500)).toEqual({});
    expect(reqUserSetPhoto(user.token, jpgUrl, 0, 0, 500, 749)).toEqual({});
    expect(reqUserSetPhoto(user.token, jpgUrl, 300, 100, 500, 749)).toEqual({});
  });
});
