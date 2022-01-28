/* eslint-disable no-param-reassign */
/* eslint-disable no-plusplus */
/* eslint-disable no-continue */

import { codes } from 'micromark-util-symbol/codes';
import { types } from 'micromark-util-symbol/types';
import { resolveAll } from 'micromark-util-resolve-all';
import { splice } from 'micromark-util-chunked';

function inlineExtension(marker, len, key) {
  const keySeq = `${key}Sequence`;
  const keySeqTmp = `${keySeq}Temporary`;

  return () => {
    function tokenize(effects, ok, nok) {
      const { previous, events } = this;

      let size = 0;

      function more(code) {
        // consume more markers if the maximum length hasn't been reached yet
        if (code === marker && size < len) {
          effects.consume(code);
          size += 1;
          return more;
        }

        // check for minimum length
        if (size < len) return nok(code);

        effects.exit(keySeqTmp);
        return ok(code);
      }

      function start(code) {
        // ignore code if it's not a marker
        if (code !== marker) return nok(code);

        if (previous === marker
            && events[events.length - 1][1].type !== types.characterEscape) return nok(code);

        effects.enter(keySeqTmp);
        return more(code);
      }

      return start;
    }

    function resolve(events, context) {
      let i = -1;

      while (++i < events.length) {
        if (events[i][0] !== 'enter' || events[i][1].type !== keySeqTmp) continue;

        let open = i;
        while (open--) {
          if (events[open][0] !== 'exit' || events[open][1].type !== keySeqTmp) continue;

          events[i][1].type = keySeq;
          events[open][1].type = keySeq;

          const border = {
            type: key,
            start: { ...events[open][1].start },
            end: { ...events[i][1].end },
          };

          const text = {
            type: `${key}Text`,
            start: { ...events[open][1].end },
            end: { ...events[i][1].start },
          };

          const nextEvents = [
            ['enter', border, context],
            ['enter', events[open][1], context],
            ['exit', events[open][1], context],
            ['enter', text, context],
          ];

          splice(
            nextEvents,
            nextEvents.length,
            0,
            resolveAll(
              context.parser.constructs.insideSpan.null,
              events.slice(open + 1, i),
              context,
            ),
          );

          splice(nextEvents, nextEvents.length, 0, [
            ['exit', text, context],
            ['enter', events[i][1], context],
            ['exit', events[i][1], context],
            ['exit', border, context],
          ]);

          splice(events, open - 1, i - open + 3, nextEvents);

          i = open + nextEvents.length - 2;
          break;
        }
      }

      events.forEach((event) => {
        if (event[1].type === keySeqTmp) {
          event[1].type = types.data;
        }
      });

      return events;
    }

    const tokenizer = {
      tokenize,
      resolveAll: resolve,
    };

    return {
      text: { [marker]: tokenizer },
      insideSpan: { null: [tokenizer] },
      attentionMarkers: { null: [marker] },
    };
  };
}

const spoilerExtension = inlineExtension(codes.verticalBar, 2, 'spoiler');

const spoilerExtensionHtml = {
  enter: {
    spoiler() {
      this.tag('<span data-mx-spoiler>');
    },
  },
  exit: {
    spoiler() {
      this.tag('</span>');
    },
  },
};

export { inlineExtension, spoilerExtension, spoilerExtensionHtml };
