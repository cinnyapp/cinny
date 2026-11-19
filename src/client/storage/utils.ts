/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

export const encodeKey = (...args: string[]): string => args.join('+');
export const MAX_UNICODE = '\u{10FFFF}';
