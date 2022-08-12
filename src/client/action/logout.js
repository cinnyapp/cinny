import initMatrix from '../initMatrix';

async function logout() {
  const mx = initMatrix.matrixClient;
  mx.stopClient();
  try {
    await mx.logout();
  } catch {
    // ignore if failed to logout
  }
  mx.clearStores();
  window.localStorage.clear();
  window.location.reload();
}

export default logout;
