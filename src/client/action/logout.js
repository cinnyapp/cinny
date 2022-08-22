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

  window.userLocalStorage.clear();
  let currentUser = window.localStorage.getItem("currentUser");
  let loggedInUsers = new Set(JSON.parse(window.localStorage.getItem("loggedInUsers")));
  loggedInUsers.delete(currentUser);
  window.localStorage.setItem("loggedInUsers", JSON.stringify(loggedInUsers));
  window.localStorage.removeItem("currentUser");

  window.location.reload();
}

export default logout;
