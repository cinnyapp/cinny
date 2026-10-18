import { putSend, PutSendOK } from 'neurone/lib/api/matrix/client/v3/rooms';
import { MatrixError, MatrixRequest, parseMatrixResp } from 'neurone/lib/matrix-request';
import { ObservableValue } from 'neurone/lib/utils/observable';
import to from 'await-to-js';
import { LocalEvent } from './LocalEvent';
import { randomStr } from '../../../app/utils/common';

export class EventSenderIdle {
  constructor(public readonly send: () => Promise<void>) {}
}

export class EventSenderPending {
  constructor(public readonly abort: () => void) {}
}

export class EventSenderSuccess {
  constructor(public readonly eventId: string) {}
}

export class EventSenderError {
  constructor(
    public readonly resend: () => Promise<void>,
    public readonly error?: MatrixError,
    public readonly cause?: unknown
  ) {}
}

export type LocalEventSenderState =
  | EventSenderIdle
  | EventSenderPending
  | EventSenderSuccess
  | EventSenderError;

export class LocalEventSender<TContent extends object = object> {
  public readonly localEvent: LocalEvent<TContent>;

  private readonly request: MatrixRequest;

  private readonly publishKey = randomStr();

  public readonly state: ObservableValue<LocalEventSenderState>;

  private sending = false;

  constructor(localEvent: LocalEvent<TContent>, request: MatrixRequest) {
    this.localEvent = localEvent;
    this.request = request;
    this.state = new ObservableValue(new EventSenderIdle(this.send.bind(this)), this.publishKey);
  }

  private markIdle() {
    this.state.publish(this.publishKey, new EventSenderIdle(this.send.bind(this)));
  }

  private markSending(abortController: AbortController) {
    this.state.publish(this.publishKey, new EventSenderPending(() => abortController.abort()));
  }

  private markSent(eventId: string) {
    this.state.publish(this.publishKey, new EventSenderSuccess(eventId));
  }

  private markFailed(error?: MatrixError, cause?: unknown) {
    this.state.publish(this.publishKey, new EventSenderError(this.send.bind(this), error, cause));
  }

  private async send(): Promise<void> {
    if (this.sending) return;
    this.sending = true;

    try {
      const abortController = new AbortController();

      this.markSending(abortController);

      const [reqError, response] = await to(
        this.request(
          putSend({
            pathParams: {
              roomId: this.localEvent.wire.roomId,
              eventType: this.localEvent.wire.type,
              txnId: this.localEvent.txnId,
            },
            body: this.localEvent.wire.content,
          })
        ),
        abortController.signal
      );

      if (reqError) {
        if (reqError.name === 'AbortError') {
          this.markIdle();
          return;
        }

        this.markFailed(undefined, reqError);
        return;
      }

      const [err, result] = await parseMatrixResp<PutSendOK>(response);

      if (err) {
        this.markFailed(err, undefined);
        return;
      }

      this.markSent(result.event_id);
    } finally {
      this.sending = false;
    }
  }
}
