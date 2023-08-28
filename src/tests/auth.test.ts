import {
  BAD_REQUEST,
  FORBIDDEN,
  reqClear,
  reqAuthRegister,
  reqAuthLogin,
  reqAuthLogout,
  reqUserProfile,
  reqAuthReqPasswordReset,
  reqAuthPasswordReset,
  reqGetResetCode,
} from '../requests';

beforeEach(reqClear);
const sampleUser = ['z5344896@ad.unsw.edu.au', 'password', 'Ahmed', 'Ibrahim'] as const;
const userWithoutEmail = ['password', 'Ahmed', 'Ibrahim'] as const;
const emailPass = ['z5344896@ad.unsw.edu.au', 'password'] as const;
const names = ['Ahmed', 'Ibrahim'] as const;

describe('/auth/login', () => {
  beforeEach(() => {
    reqAuthRegister(...sampleUser);
  });

  test('correct return type', () => {
    const returnRes = reqAuthLogin('z5344896@ad.unsw.edu.au', 'password');
    expect(returnRes).toStrictEqual({ token: expect.any(String), authUserId: expect.any(Number) });
    expect(Number(returnRes.token)).toEqual(expect.any(Number));
  });

  test('error: email does not belong to a user', () => {
    const returnRes = reqAuthLogin('z5344896@ad.usyd.edu.au', 'password');
    expect(returnRes).toEqual(BAD_REQUEST);
  });

  test('error: incorrect password', () => {
    const returnRes = reqAuthLogin('z5344896@ad.unsw.edu.au', 'pass');
    expect(returnRes).toEqual(BAD_REQUEST);
  });
});

describe('/auth/register', () => {
  describe('basic functionality', () => {
    test('correct return type', () => {
      const returnRes = reqAuthRegister(...sampleUser);
      expect(returnRes).toStrictEqual({ token: expect.any(String), authUserId: expect.any(Number) });
    });

    test.skip('ID uniqueness', () => {
      const IDs = [];
      for (let i = 0; i < 100; i++) {
        IDs.push(reqAuthRegister('email' + i + '@gmail.com', ...userWithoutEmail).authUserId);
      }
      expect(new Set(IDs).size).toEqual(100);
    });
  });

  describe('error handling', () => {
    test('invalid email', () => {
      expect(reqAuthRegister('email@@gmail.com', ...userWithoutEmail)).toEqual(BAD_REQUEST);
    });

    test('email already registered in database', () => {
      reqAuthRegister(...sampleUser);
      expect(reqAuthRegister(...sampleUser)).toEqual(BAD_REQUEST);
    });

    test('weak password (less than 6 characters)', () => {
      expect(reqAuthRegister('email@gmail.com', 'pass', ...names)).toEqual(BAD_REQUEST);
    });

    test.each([
      ['', ''],
      ['Ahmed', ''],
      ['', 'Ibrahim'],
    ])('names are empty strings', (nameFirst, nameLast) => {
      expect(reqAuthRegister(...emailPass, nameFirst, nameLast)).toEqual(BAD_REQUEST);
    });

    const moreThanFifty = 'a'.repeat(51);
    test.each([
      [moreThanFifty, moreThanFifty],
      ['Ahmed', moreThanFifty],
      [moreThanFifty, 'Ibrahim'],
    ])('names are too long', (nameFirst, nameLast) => {
      expect(reqAuthRegister(...emailPass, nameFirst, nameLast)).toEqual(BAD_REQUEST);
    });
  });

  describe('user handle generation', () => {
    const getHandleStr = (user: { token: string, authUserId: number }) => (
      reqUserProfile(user.token, user.authUserId).user.handleStr
    );

    test('simple concatenation', () => {
      const user = reqAuthRegister(...sampleUser);
      expect(getHandleStr(user)).toEqual('ahmedibrahim');
    });

    test('concatenation has non-alphanumeric characters', () => {
      const user = reqAuthRegister(...emailPass, 'ahm@@d2', 'ibr him');
      expect(getHandleStr(user)).toEqual('ahmd2ibrhim');
    });

    test('concatenation has uppercase characters', () => {
      const user = reqAuthRegister(...emailPass, 'Ahmed2', 'Ibrahim');
      expect(getHandleStr(user)).toEqual('ahmed2ibrahim');
    });

    test('appending 0 to duplicate user handle', () => {
      reqAuthRegister(...sampleUser);
      const user = reqAuthRegister('email0@gmail.com', ...userWithoutEmail);
      expect(getHandleStr(user)).toEqual('ahmedibrahim0');
    });

    test.skip('appending 2 to duplicate user handles', () => {
      reqAuthRegister(...sampleUser);
      reqAuthRegister('email0@gmail.com', ...userWithoutEmail);
      reqAuthRegister('email1@gmail.com', ...userWithoutEmail);
      const user = reqAuthRegister('email2@gmail.com', ...userWithoutEmail);
      expect(getHandleStr(user)).toEqual('ahmedibrahim2');
    });

    test.skip('appending number to duplicate user handles - more complex case', () => {
      reqAuthRegister('email@gmail.com', ...userWithoutEmail);
      reqAuthRegister('email0@gmail.com', ...userWithoutEmail);
      reqAuthRegister('email1@gmail.com', 'password', 'ahmed', 'ibrahim2');
      const user = reqAuthRegister('email2@gmail.com', ...userWithoutEmail);
      expect(getHandleStr(user)).toEqual('ahmedibrahim1');
    });

    test('concatenation has more than 20 characters', () => {
      const user = reqAuthRegister(...emailPass, 'ahmed', 'supercalifragilistic');
      expect(getHandleStr(user)).toEqual('ahmedsupercalifragil');
    });

    test('concatenation > 20 and has non-alphanumeric/uppercase characters', () => {
      const user = reqAuthRegister(...emailPass, 'Ahm@d', 'SUPER-cali-fragilistic');
      expect(getHandleStr(user)).toEqual('ahmdsupercalifragili');
    });

    test('concatenation > 20 and append number to user handle', () => {
      const args = ['password', 'ahmed', 'supercalifragilistic'] as const;
      reqAuthRegister('email@gmail.com', ...args);
      reqAuthRegister('email0@gmail.com', ...args);
      const user = reqAuthRegister('email1@gmail.com', ...args);
      expect(getHandleStr(user)).toEqual('ahmedsupercalifragil1');
    });
  });
});

describe('/auth/logout', () => {
  test('invalid token', () => {
    expect(reqAuthLogout('1')).toEqual(FORBIDDEN);
  });

  test('logging out once', () => {
    const { token } = reqAuthRegister(...sampleUser);
    expect(reqAuthLogout(token)).toStrictEqual({});
  });

  test.skip('logging out twice', () => {
    const { token } = reqAuthRegister(...sampleUser);
    expect(reqAuthLogout(token)).toStrictEqual({});
    expect(reqAuthLogout(token)).toEqual(FORBIDDEN);
  });

  test.skip('logging out with two active tokens', () => {
    const { token: t1 } = reqAuthRegister(...sampleUser);
    const { token: t2 } = reqAuthLogin(...emailPass);
    expect(reqAuthLogout(t1)).toStrictEqual({});
    expect(reqAuthLogout(t1)).toEqual(FORBIDDEN);
    expect(reqAuthLogout(t2)).toStrictEqual({});
    expect(reqAuthLogout(t2)).toEqual(FORBIDDEN);
  });

  test.skip('logging out does not invalidate other active sessions', () => {
    const userId = reqAuthRegister('email@gmail.com', ...userWithoutEmail).authUserId;
    const { token: t1 } = reqAuthRegister(...sampleUser);
    const { token: t2 } = reqAuthLogin(...emailPass);

    reqAuthLogout(t1);
    expect(reqUserProfile(t1, userId)).toEqual(FORBIDDEN);
    expect(reqUserProfile(t2, userId)).toStrictEqual({
      user: {
        uId: userId,
        email: 'email@gmail.com',
        nameFirst: 'Ahmed',
        nameLast: 'Ibrahim',
        handleStr: 'ahmedibrahim',
        profileImgUrl: expect.any(String),
      }
    });
  });
});

describe('auth password reset', () => {
  let email: string;
  let uId: number;
  beforeEach(() => {
    email = 'beans.passreset@gmail.com';
    uId = reqAuthRegister(email, 'password', 'Ahmed', 'Ibrahim').authUserId;
  });

  test('invalid email', () => {
    expect(reqAuthReqPasswordReset('invalid@xyz.com')).toStrictEqual({});
  });

  test('correct return type', () => {
    expect(reqAuthReqPasswordReset(email)).toStrictEqual({});
  });

  test('invalid reset code supplied', () => {
    expect(reqAuthPasswordReset('invalid code', 'cooler password')).toEqual(BAD_REQUEST);
  });

  test('invalid password length', () => {
    reqAuthReqPasswordReset(email);
    expect(reqAuthPasswordReset('reset', 'pass')).toEqual(BAD_REQUEST);
  });

  test('correct reset code suuplied', () => {
    reqAuthReqPasswordReset(email);
    const resetCode = reqGetResetCode(uId);
    expect(reqAuthPasswordReset(resetCode, 'cooler password')).toEqual({});
    expect(reqAuthLogin(email, 'password')).toEqual(BAD_REQUEST);
    expect(reqAuthLogin(email, 'cooler password')).toStrictEqual({
      token: expect.any(String),
      authUserId: expect.any(Number),
    });
  });
});
