import React from 'react';
import parse, { HTMLReactParserOptions } from 'html-react-parser';
import { MessageEmptyContent } from './content';
import { sanitizeCustomHtml } from '../../utils/sanitize';
import { emojifyAndLinkify } from '../../plugins/react-custom-html-parser';

type RenderBodyProps = {
  body: string;
  customBody?: string;
  htmlReactParserOptions: HTMLReactParserOptions;
};
export function RenderBody({ body, customBody, htmlReactParserOptions }: RenderBodyProps) {
  if (body === '') <MessageEmptyContent />;
  if (customBody) {
    if (customBody === '') <MessageEmptyContent />;
    return parse(sanitizeCustomHtml(customBody), htmlReactParserOptions);
  }
  return emojifyAndLinkify(body, true);
}
