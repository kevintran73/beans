import validator from 'validator';
import HTTPError from 'http-errors';
import nodemailer from 'nodemailer';
import { BAD_REQUEST } from '../requests';
import { getData, setData } from '../dataStore';
import { EmptyObj, Auth, User } from '../types';
import { getHashOf, generateId, handleGenerate, checkLength, getUser, getTime } from '../helpers';
import config from '../config.json';

const PORT = 420;
export const SECRET = 'very secretive secret';

// Given a registered user's email and password, logs them into the app and
// generates a unique token for them, returning its value and the user's ID.
// Returns an error if email/password is invalid.
function authLogin(email: string, password: string): Auth {
  const data = getData();
  const user = data.users.find(u => u.email === email.toLowerCase());
  if (!user) {
    throw HTTPError(BAD_REQUEST, 'email is not registered');
  } else if (getHashOf(password) !== user.password) {
    throw HTTPError(BAD_REQUEST, 'incorrect password');
  }

  const token = String(generateId());
  user.tokens.push(getHashOf(token + SECRET));
  setData(data);

  return { token, authUserId: user.uId };
}

// Registers a new account for a user creating a unique handle string for them, and returning
// thier uniquely created token and user ID. Returns an error if paraameters are invalid.
function authRegister(email: string, password: string, nameFirst: string, nameLast: string): Auth {
  const data = getData();
  email = email.toLowerCase();
  checkLength(nameFirst, 1, 50);
  checkLength(nameLast, 1, 50);

  if (!validator.isEmail(email)) {
    throw HTTPError(BAD_REQUEST, 'email is invalid');
  } else if (data.users.find(u => u.email === email.toLowerCase())) {
    throw HTTPError(BAD_REQUEST, 'email is already registered');
  } else if (password.length < 6) {
    throw HTTPError(BAD_REQUEST, 'password needs to be at least six characters');
  }

  const [token, user] = userGenerate(email, password, nameFirst, nameLast);
  data.users.push(user);
  setData(data);

  return { token, authUserId: user.uId };
}

// Given an active token, invalidates the token to log the user out.
function authLogout(token: string): EmptyObj {
  const data = getData();
  const user = getUser(token);
  user.tokens.splice(user.tokens.indexOf(getHashOf(token + SECRET)), 1);
  setData(data);
  return {};
}

// Given an email address, if the email address belongs to a registered user,
// sends them an email containing a secret password reset code, and logging them
// out of all current sessions.
function authReqPasswordReset(email: string): EmptyObj {
  const data = getData();
  const user = data.users.find(u => u.email === email.toLowerCase());
  if (!user) {
    return {};
  }

  user.tokens = [];
  const resetCode = String(generateId());
  data.resetCodes.push({ resetCode, uId: user.uId });
  sendEmail(email, resetCode);
  setData(data);

  return {};
}

// Given a reset code for a user, sets that user's new password to the password provided.
// Once a reset code has been used, it is then invalidated.
function authPasswordReset(resetCode: string, newPassword: string): EmptyObj {
  const data = getData();
  const resetCodeObj = data.resetCodes.find(code => code.resetCode === resetCode);
  if (newPassword.length < 6) {
    throw HTTPError(BAD_REQUEST, 'password needs to be at least six characters');
  } else if (!resetCodeObj) {
    throw HTTPError(BAD_REQUEST, 'invalid reset code');
  }

  getUser(resetCodeObj.uId).password = getHashOf(newPassword);
  data.resetCodes.splice(data.resetCodes.indexOf(resetCodeObj), 1);

  setData(data);
  return {};
}

// Creates a user object to store in the database.
function userGenerate(email: string, password: string, nameFirst: string, nameLast: string): [string, User] {
  const timeStamp = getTime();

  if (!getData().workspaceStats) {
    getData().workspaceStats = {
      channelsExist: [{
        numChannelsExist: 0, timeStamp
      }],
      dmsExist: [{
        numDmsExist: 0, timeStamp
      }],
      messagesExist: [{
        numMessagesExist: 0, timeStamp
      }],
      utilizationRate: 0,
    };
  }

  const token = String(generateId());
  const user = {
    nameFirst,
    nameLast,
    email,
    uId: generateId(),
    password: getHashOf(password),
    profileImgUrl: `${config.url}:${config.port}/static/default.jpg`,
    handleStr: handleGenerate(nameFirst, nameLast),
    isGlobalOwner: !getData().users.length,
    tokens: [getHashOf(token + SECRET)],
    userStats: {
      channelsJoined: [{
        numChannelsJoined: 0, timeStamp
      }],
      dmsJoined: [{
        numDmsJoined: 0, timeStamp
      }],
      messagesSent: [{
        numMessagesSent: 0, timeStamp
      }],
      involvementRate: 0,
    },
  };
  return [token, user];
}

// Sends an email to the specified address containing a reset code.
function sendEmail(email: string, resetCode: string) {
  const transporter = nodemailer.createTransport({
    port: PORT,
    secure: true,
    service: 'gmail',
    auth: {
      user: process.env.EMAIL,
      pass: process.env.PASSWORD
    },
  });

  transporter.sendMail({
    from: process.env.EMAIL,
    to: email,
    subject: 'Password Reset',
    text: 'Hi,\n\nYour password reset code for your Beans account is: ' + resetCode,
  });
}

export { authRegister, authLogin, authLogout, authReqPasswordReset, authPasswordReset };
