import validator from 'validator';
import HTTPError from 'http-errors';
import request from 'sync-request';
import { BAD_REQUEST } from '../requests';
import { getData, setData } from '../dataStore';
import { checkLength, getUser } from '../helpers';
import { EmptyObj, Profile, Profiles } from '../types';
import config from '../config.json';

// For a valid user, returns information about their
// user ID, email, first name, last name, and handle.
function userProfile(token: string, uId: number): Profile {
  getUser(token);
  const user = getData().removedUsers.find(u => u.uId === uId) || getUser(uId);
  const profile = {
    uId,
    email: user.email,
    nameFirst: user.nameFirst,
    nameLast: user.nameLast,
    handleStr: user.handleStr,
    profileImgUrl: user.profileImgUrl,
  };
  return { user: profile };
}

// Returns a list of all users containing information about
// their user ID, email, first name, last name, and handle.
function usersAll(token: string): Profiles {
  getUser(token);
  return { users: getData().users.map(u => userProfile(token, u.uId).user) };
}

// Updates the authorised user's first and last names.
function userSetName(token: string, nameFirst: string, nameLast: string): EmptyObj {
  const data = getData();
  const user = getUser(token);
  checkLength(nameFirst, 1, 50);
  checkLength(nameLast, 1, 50);

  user.nameFirst = nameFirst;
  user.nameLast = nameLast;
  setData(data);

  return {};
}

// Updates the authorised user's email address.
function userSetEmail(token: string, email: string): EmptyObj {
  const data = getData();
  const user = getUser(token);
  email = email.toLowerCase();

  if (!validator.isEmail(email)) {
    throw HTTPError(BAD_REQUEST, 'email is invalid');
  } else if (data.users.find(u => u.email === email)) {
    throw HTTPError(BAD_REQUEST, 'email already belongs to a user');
  }

  user.email = email;
  setData(data);

  return {};
}

// Updates the authorised user's handle.
function userSetHandle(token: string, handleStr: string): EmptyObj {
  const data = getData();
  const user = getUser(token);
  checkLength(handleStr, 3, 20);

  if (data.users.find(u => u.handleStr === handleStr)) {
    throw HTTPError(BAD_REQUEST, 'handle already in use');
  } else if (/[^\w]/.test(handleStr)) {
    throw HTTPError(BAD_REQUEST, 'handle may only contain alphanumeric characters');
  }

  user.handleStr = handleStr;
  setData(data);

  return {};
}

// Given a URL of an image on the internet, crops the image within bounds
// (xStart, yStart) and (xEnd, yEnd). Position (0,0) is the top left.
function userSetPhoto(token: string, imgUrl: string, [xStart, yStart, xEnd, yEnd]: number[]): EmptyObj {
  const user = getUser(token);
  const data = getData();
  if (xEnd <= xStart || yEnd <= yStart) {
    throw HTTPError(BAD_REQUEST, 'invalid dimensions specified');
  }

  let res;
  let imageData;
  try {
    res = request('GET', imgUrl);
    imageData = res.getBody();
  } catch (err) {
    throw HTTPError(BAD_REQUEST, 'unable to retrieve image from url');
  }

  const sizeOf = require('image-size');
  const dimensions = sizeOf(imageData);

  if (xStart < 0 || yStart < 0 || xEnd <= 0 || yEnd <= 0 ||
    xStart >= dimensions.width || yStart >= dimensions.height ||
    xEnd > dimensions.width || yEnd > dimensions.height
  ) {
    throw HTTPError(BAD_REQUEST, 'positions specified are not within dimensions of image');
  } else if (dimensions.type !== 'jpg') {
    throw HTTPError(BAD_REQUEST, 'image is not a JPG');
  }

  const sharp = require('sharp');
  sharp(imageData)
    .extract({ width: xEnd - xStart, height: yEnd - yStart, left: xStart, top: yStart })
    .toFile(`profile_photos/${user.uId}.jpg`);

  user.profileImgUrl = `${config.url}:${config.port}/static/${user.uId}.jpg`;
  setData(data);

  return {};
}

export { userProfile, usersAll, userSetName, userSetEmail, userSetHandle, userSetPhoto };
