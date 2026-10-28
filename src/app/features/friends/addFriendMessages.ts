import { FriendsApiError } from './friendsApi';

export const sendSuccessMessage = (result: 'pending' | 'accepted', userId: string): string =>
  result === 'pending' ? `Request sent to ${userId}` : `You're now friends with ${userId}`;

export const sendErrorMessage = (error: unknown, userId: string): string => {
  const code = error instanceof FriendsApiError ? error.code : undefined;
  switch (code) {
    case 'invalid_user_id':
      return "That's not a valid username";
    case 'self':
      return "That's you";
    case 'other_server':
      return 'Only blazeroom.com.br users can be added';
    case 'no_such_user':
      return `No user named ${userId}`;
    case 'already_friends':
      return "You're already friends";
    case 'already_requested':
      return 'Request already sent';
    default:
      return "Couldn't send the request, try again";
  }
};
