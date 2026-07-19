import { postLogout } from 'neurone/lib/api/matrix/client/v3/logout';
import { MatrixRequest, parseMatrixResp, printMatrixError } from 'neurone/lib/matrix-request';
import { Disposable, Disposer } from 'neurone/lib/utils/disposable';
import { ObservableValue } from 'neurone/lib/utils/observable';

export class LogoutManager implements Disposable {
  private readonly disposer = new Disposer();

  private readonly request: MatrixRequest;

  private readonly deleteStorage: () => Promise<void>;

  constructor(
    logoutObservable: ObservableValue<boolean>,
    request: MatrixRequest,
    deleteStorage: () => Promise<void>
  ) {
    this.request = request;
    this.deleteStorage = deleteStorage;

    this.disposer.collect(
      logoutObservable.subscribe((loggedOut) => {
        if (loggedOut) {
          this.clearStoresAndRefresh();
        }
      })
    );
  }

  async logout(): Promise<void> {
    const response = await this.request(postLogout({}));
    const [err] = await parseMatrixResp(response);

    if (err) {
      throw new Error(printMatrixError(err));
    }

    await this.clearStoresAndRefresh();
  }

  private async clearStoresAndRefresh(): Promise<void> {
    await this.deleteStorage();
    window.localStorage.clear();
    window.location.reload();
  }

  dispose(): void {
    this.disposer.run();
  }
}
