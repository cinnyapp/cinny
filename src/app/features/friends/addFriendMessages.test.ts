import { describe, expect, it } from 'vitest';
import { FriendsApiError } from './friendsApi';
import { sendErrorMessage, sendSuccessMessage } from './addFriendMessages';

const id = '@kist:blazeroom.com.br';

describe('sendSuccessMessage', () => {
  it('maps pending and accepted', () => {
    expect(sendSuccessMessage('pending', id)).toBe(`Request sent to ${id}`);
    expect(sendSuccessMessage('accepted', id)).toBe(`You're now friends with ${id}`);
  });
});

describe('sendErrorMessage', () => {
  it.each([
    ['invalid_user_id', "That's not a valid username"],
    ['self', "That's you"],
    ['other_server', 'Only blazeroom.com.br users can be added'],
    ['no_such_user', `No user named ${id}`],
    ['already_friends', "You're already friends"],
    ['already_requested', 'Request already sent'],
    ['homeserver_unavailable', "Couldn't send the request, try again"],
    ['network', "Couldn't send the request, try again"],
    ['something_else', "Couldn't send the request, try again"],
  ])('%s', (code, message) => {
    expect(sendErrorMessage(new FriendsApiError(code, 400), id)).toBe(message);
  });

  it('falls back for non-API errors', () => {
    expect(sendErrorMessage(new Error('boom'), id)).toBe("Couldn't send the request, try again");
  });
});
